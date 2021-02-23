/*
const http = require('http');

const hostname = '127.0.0.1';
const port = 3000;

const server = http.createServer((req, res) => {
  res.statusCode = 200;
  res.setHeader('Content-Type', 'text/plain');
  res.end('Hello World');
});

server.listen(port, hostname, () => {
  console.log(`Server running at http://${hostname}:${port}/`);
});
*/
// Note to run Node you need to write node resources/scripts/functions.js
// then listen on http://localhost:3000 (in this case 3000 is port).






// seems to be a lot like c++.

var inspect = require('inspect-stream');
var arrayify = require('arrayify-merge.s');
var slice    = require('slice-flow.s');
var sk = require('scikit-learn');
var tf = require('@tensorflow/tfjs');
var ts = require('timeseries-analysis');
const fs = require('browserify-fs');
const { SSL_OP_SSLEAY_080_CLIENT_DH_BUG } = require('constants');
const { settings } = require('cluster');
const path = require('path');
const buildFilters = (filters) =>{
    return filters.join(";");
};

const buildStructure = (structure) => {
    var myJSON = JSON.stringify(structure);
    return myJSON;
};

const buildUrl = (base,filters,structure) => {
    filtersURL = buildFilters(filters)
    structureURL = buildStructure(structure);
    url = base + "filters=" + filtersURL + "&structure=" + structureURL;
    console.log(encodeURI(url));
    return encodeURI(url);
    
};

const getData = (url) => {
    var xhttp = new XMLHttpRequest();
    return new Promise(function (resolve, reject)
    {
        xhttp.onreadystatechange = function () {
            if(xhttp.readyState != 4)
            {
                return
            } else if(xhttp.status == 200) {
                resolve(xhttp);
            } else {
                reject({status: xhttp.status, statusText: xhttp.statusText});
            }
        }
        xhttp.open("GET",url)
        xhttp.send();
    });
}

function averager(array, windowSize)
{
    // Takes array and returns moving average array. 
    // 1 2 3 4 5 6 wS=5 numWindows = N - 2*Math.floor(windowSize/2),  start = 0, end= N-window_size 
    //     v v
    // 1 2 3 4 5 6 7 8 wS = 4 numWindows = N + 1 - windowSize
    //    v v v v v
    // The two expressions are equivalent in their respective cases so I'll just go with the simpler one.
    
    var N  = array.length; // 33
    var start = 0; 
    var end = N - windowSize + 1; // 2
    //var numWindows = N + 1 - windowSize; 

    var arrayOut = []
    for(var i=start; i<end; i++)     {
        var subArray = array.slice(i,i+windowSize); 
        
        var subSum = subArray.reduce((a,b)=> (a+b))/windowSize
        arrayOut.push(subSum);
    }
 
    return arrayOut;
    
}

function sma(dates, quantityArray, windowSize)
{
    // dates and quantityArray should be the same size.
    // If moving average window is even we would have to plot at mid point of dates.
    var N = quantityArray.length;
    var start;
    var end;
    var datesOut;
    var arrayOut;

    if(windowSize % 2 == 0)
    {
        // If windowSize is even you smooth twice so you still land on a data point
        // 1 2 3 4 5 6 7 8  wS = 4
        //    v v v v v   wS = 4
        //     v v v v      wS = 2
        //     3 4 5 6     3 = ws/2 + 1  6 = N
        //  if even we divide window size by 2 and do it twice
        var evenWindow = windowSize/2;

        var fstPassArray = averager(quantityArray,windowSize);
        arrayOut = averager(fstPassArray, 2);

        
        start = evenWindow; 
        end = -1-start; 
       
    } else {
        // Odd case: 
        // 1 2 3 4 5 6 7 8
        //   v v v v v v    wS = 3
        //     v v v v      wS = 5
      
        arrayOut = averager(quantityArray, windowSize);
        start = Math.floor(windowSize/2);
        end = - 1 - start
    }

    datesOut = dates.slice(start,end+1); 

    return [datesOut, arrayOut];
  
}

function plot(div,dataPairSelected, windowSize,emaWindowSize, titleName, metricName, forecastDays)
{
    var dates = dataPairSelected["dates"];
    var metricToPlot = dataPairSelected["metrics"];
    var degree;
    var sampleSize;
    if(dataPairSelected.hasOwnProperty("sampleSize"))
    {
        sampleSize = dataPairSelected["windowSize"]; // unfortunate clash with variable name.
    } else {
        sampleSize = dataPairSelected["dates"].length; 
    }
    if(dataPairSelected.hasOwnProperty("degree"))
    {
        degree = dataPairSelected["degree"];
    } else{
        degree = Math.min(sampleSize -1 , 20);
    }
    
    // using the sampleSize because as we are forecasting I think more data is just better.
    // The proportion of data we know is valid is higher.
    var [forecastDates, forecastArray] = forecast(dates,metricToPlot,forecastDays,degree,sampleSize);
    var tmpDates = forecastDates.slice(0,-1);
    var tmpMetric = forecastArray.slice(0,-1); // remove repeated value.
    var concatDates = tmpDates.concat(dates);
    var concatMetric = tmpMetric.concat(metricToPlot);
    var [smaDates, smaArray] = sma(concatDates,concatMetric, windowSize);
    var [emaDates,emaArray] = ema(concatDates, concatMetric, emaWindowSize);
    
    
    var shift = Math.floor(windowSize/2);
 
    var movingDates = smaDates.slice(forecastDays-shift);
    var movingArray = smaArray.slice(forecastDays-shift);

    var smaForecastDates = smaDates.slice(0,forecastDays-shift+1);
    var smaForecastArray = smaArray.slice(0,forecastDays-shift+1);

    var emaMovingDates = emaDates.slice(forecastDays);
    var emaMovingArray = emaArray.slice(forecastDays);

    var emaForecastDates = emaDates.slice(0,forecastDays+1);
    var emaForecastArray = emaArray.slice(0,forecastDays+1);

    

    var dataToPlot = [
        {
            x: dates,
            y: metricToPlot,
            type: "bar",
            name: metricName,
            marker: {
                color: "#004c6d"
            },
         
        },
        /*
        {
            x: forecastDates.slice(0,-1),
            y: forecastArray.slice(0,-1),
            name: forecastDays.toString() + "-day forecast",
            type: "bar",
            marker: {
                color: "#0075a8",
            },
           
            
        },
        */
        {
            x: movingDates,
            y: movingArray,
            name:  windowSize.toString() + "-day SMA",
            type: "lines",
            mode: "lines",
            line: {
                color: "orange"
            }
            
        },
        {
            x: emaMovingDates,
            y: emaMovingArray,
            name:  emaWindowSize.toString() + "-day EMA",
            type: "lines",
            mode: "lines",
            line: {
                color: "red"
            }
        },
        {
            x: smaForecastDates,
            y: smaForecastArray,
            type: "scatter",
            name: "SMA forecast",
            mode: "markers",
            marker: {
                color: "orange",
                size: 2,
                opacity: 0.5
            }
        },
        {
            x: emaForecastDates,
            y: emaForecastArray,
            type: "scatter",
            name: "EMA forecast",
            mode: "markers",
            marker: {
                color: "red",
                size: 2,
                opacity: 0.5,
            
            }
        },



    ];

    var layout = {
        plot_bgcolor: "black",
        paper_bgcolor: "black",
        font: {
            family: "Archivo, sans-serif",
            color: "white"

        },
       
        title: {
            text: "<b>"+titleName+"<b>",
            font: {
                family: "Archivo, sans-serif",
                color: "white",
                size: 20
            }
        },
        xaxis: {
            title: {
                text: ""
            },
            autorange: true,
            //gridcolor: "white",
            autotick: true,
            tickcolor: "white"
            
        },
        yaxis: {
            autorange: true,
            //gridcolor: "white",
            autotick: true,
            tickcolor: "white"
        },
        showlegend: true,
        legend: {
            x: 0.01,
            xanchor: "left",
            y: 0.99,
            yanchor: "top",
            bgcolor: "transparent"
        },
     
        
        
    };
    
    
    
    

    Plotly.newPlot(div, dataToPlot, layout);
    // below is how to access data/layout and therefore change them.
    //console.log(div.data);
    //console.log(div.layout);
    
}

function extractMetric(metricArrays, metricName)
{

    var metric = [];
    for(var date in metricArrays)
    {
        metric.push(metricArrays[date][metricName])
    }
    return  metric;
}

function extractMultMetrics(metricArrays, metricNames)
{
    var dateKeys = Object.keys(metricArrays);
    var dates = dateKeys.map((v)=> v);
    var storage = {};

    metricNames.forEach(metricName => {

        
        var metric = extractMetric(metricArrays,metricName);
    
        var [newDates,newMetric] = removeZeros(dates,metric);
        storage[metricName] = {};
        
        storage[metricName]["dates"] = newDates;
        storage[metricName]["metrics"] = newMetric; 
    });



    return storage
}

function isDateBetween(testDate, startDate, endDate)
{
    var lessThanEnd = false;
    var moreThanStart = false;
    var start,end,test;
    // Date format is YYYY-MM-DD
    if(endDate=="current")
    {
        lessThanEnd = true;
    } 
    start = startDate.split("-");
    end = endDate.split("-");
    test = testDate.split("-");

    startInts = start.map((string) => parseInt(string));
    endInts = start.map((string)=> parseInt(string));
    testInts = start.map((string)=> parseInt(string));
    if(testInts[0] < endInts[0])
    {
        lessThanEnd = true;
    } else if(testInts[0] == endInts[0]){
        if(testInts[1] < endInts[1])
        {
            lessThanEnd = true;
        } else if(testInts[1] == endInts[1]){
            if(testInts[2] <= endInts[2]){
                lessThanEnd = true;
            }
        }
    }

    if(startInts[0] < testInts[0])
    {
        moreThanStart = true;
    } else if(testInts[0] == startInts[0]){
        if(startInts[1] < testInts[1])
        {
            moreThanStart = true;
        } else if(testInts[1] == startInts[1]){
            if(startInts[2] <= testInts[2]){
                moreThanStart = true;
            }
        }
    }
    return moreThanStart & lessThanEnd;

    
    

}


function removeZeros(dates, metric)
{
    
    var startIx =0;
    var endIx = 0; 
    startIx = findNonZero(dates,metric); 
    metric.reverse()
    endIx = findNonZero(dates,metric);
    metric.reverse();
    // using metric.length because slice is weird -- impossible to slice whole array using negatives.
    var newDates = dates.slice(startIx, metric.length - endIx); 
    var newMetric = metric.slice(startIx, metric.length - endIx);

    return [newDates, newMetric]
}

function findNonZero(dates, metric)
{
    for(var i =0; i<metric.length; i++)
    {
        if(metric[i] == 0){
            continue
        } else {
            return i;
        }
    }
    return 0;
}

/*
function onBatchEnd(batch, logs) 
{
    console.log('Logs', logs);
}


async function buildFeatures(dates,metric)
{
    // The purpose of this function is, given a metric, to create features which can be used in an ML model.
    // This means the i_th feature must be calculable before the i_th metric has appeared. 
    // So I can't use SMA for example as it uses data from the future.
    // Storage will be JSON as follows:
    // features = {}
    // We will also need to truncate dates and metric (very slightly).
    // This function wiwll output fixedDates, fixedMetric and features. 
    // Those three outputs should be stored in a similar way to metricArrays. 
    // i.e. featureArray = {"date1": {{featureName1: , featureName2: }, metric}} // where featureName and metric correspond to date.  

    // Will build simple features first so I can get testing quickly. 
    [emaDates, emaMetric1] = ema(dates,metric,7);
     // remove latest data point as we want to use ema for yesterday.
     
    var emaMetric = emaMetric1.slice(1);
    var emaTarget = emaMetric1.slice(0,-1); 
    var M = metric.length;
    var N = emaMetric.length;
    console.log(emaTarget.length)

    var truncMetric = metric.slice(0, N); // we want to miss last (the earliest in time) data point as want to use ema from day before.
    var truncDates = dates.slice(0, N);
    
    var shiftMetric = metric.slice(1,N+1);
    
    var trainStartIx = Math.floor(N/5);
    var validStartIx = 0;
    var validEndIx= trainStartIx;

    var trainMetric = truncMetric.slice(trainStartIx);
    
    var trainDates = truncDates.slice(trainStartIx);

    var validMetric = truncMetric.slice(validStartIx, validEndIx);
    var emaTargetTrain = emaTarget.slice(trainStartIx);
    var emaTargetValid = emaTarget.slice(validStartIx,validEndIx)
    var validDates = truncDates.slice(validStartIx, validEndIx);
    // don't need train dates for the moment.

    var trainEma = emaMetric.slice(trainStartIx);
    var validEma = emaMetric.slice(validStartIx,validEndIx);

    var trainShiftMetric = shiftMetric.slice(trainStartIx);

    var validShiftMetric = shiftMetric.slice(validStartIx,validEndIx);

    var trainFeatures = tf.tensor([trainEma, trainShiftMetric]).transpose();

    var validFeatures = [validEma, validShiftMetric];
    console.log(validFeatures)
    var trainMetrics = tf.tensor([trainMetric, emaTargetTrain]).transpose();
    console.log(trainMetrics)
    // Model start
    // ***********
    
    var model = tf.sequential({
        layers: [
            tf.layers.dense({inputShape: [2], units: 100}),
            tf.layers.dense({units: 2}),
        ]
    });
    
    model.compile({
        optimizer: tf.train.adam(),
        loss: tf.losses.meanSquaredError,
        metrics: tf.metrics.meanAbsoluteError
    });
    console.log("compiled")
    var history = await model.fit(trainFeatures, trainMetrics, {
        epochs: 15,
        batchSize: 32,
        });

    console.log("fitted")
    console.log(history);


    model.summary();
  
    

// structure of validFeatures is [[], []]
// so that's why the structure of features is gross below.
    var resArray=[];
    var N = validFeatures[0].length;
    var res = tf.tensor([[validFeatures[0][N-1],], [validFeatures[1][N-1],]]).transpose();
    
    console.log(validDates)
    for(var i = 0; i<validMetric.length; i++)
    {
        // needed to add the comma into the features array otherwise tensorflow gets confused with 1x2 array because 1d.
        res.print();
        
        var res0 = model.predict(res).arraySync()[0];
        
        var res = tf.tensor([[res0[0],],[res0[1],]]).transpose();
        resArray.unshift(res0[0]);
    }

    console.log(resArray)
    var data = [
        
        {
            x: validDates,
            y: validMetric,
            name: "real valid"
        },
        
        {
            x: validDates,
            y: resArray,
            name: "predicted"
        },
        {
            x: trainDates,
            y: trainMetric,
            name: "training"
        } 
    ];
    var div = document.getElementById("t6");
    Plotly.newPlot(div, data);
    
}
*/


function dateRange(startDate, endDate, steps = 1) 
{
    // from stack overflow: https://stackoverflow.com/questions/4413590/javascript-get-array-of-dates-between-2-dates.
    const dateArray = [];
    let currentDate = new Date(startDate);
  
    while (currentDate <= new Date(endDate)) {
      dateArray.push(new Date(currentDate));
      // Use UTC date to prevent problems with time zones and DST
      currentDate.setUTCDate(currentDate.getUTCDate() + steps);
    }
    
    return dateArray;
}

function formatDate(date) {
    var d = new Date(date),
        month = '' + (d.getMonth() + 1),
        day = '' + d.getDate(),
        year = d.getFullYear();

    if (month.length < 2) 
        month = '0' + month;
    if (day.length < 2) 
        day = '0' + day;

    return [year, month, day].join('-');
}

function forecast(dates,metric,forecastDays, degree, windowSize)
{
    // this function works for any timestep if dates are omitted.
 
    var latestDate = new Date(dates[0]);
    latestDate.setUTCDate(latestDate.getUTCDate() + 1);
   
    var forecastToDate =  new Date(dates[0]);
    forecastToDate.setUTCDate(forecastToDate.getUTCDate() + forecastDays );
    
    var datesToAdd = dateRange(latestDate,forecastToDate, 1);
    
    var data = [];
    var N = dates.length; // N is essentially the window size.
    
    for(var i = 0; i<N; i++)
    {
        data.unshift([dates[i],metric[i]])
    }
    
    var t = new ts.main(data);
    t.smoother({period: 25});

    




    for(var i =0; i<forecastDays; i++)
    {
        t.data.push([datesToAdd[i],0]);
    }


    
    

    var coeffs;
    var L = t.data.length;
    
    var startIx, endIx;
    
    if(degree >= windowSize)
    {
        throw new Error("degree must be greater than window size")
    }
    console.log("N",N)
    // startIx = realdata.length - N 
    for(var i=0; i<forecastDays; i++)
    {
        startIx = N-windowSize+i;
        endIx = i+N; // say N = 300 when i=0 this is 301
        var coeffData
        if(endIx == L) // I don't know how to make this nicer - splice is just strange.
        {
            coeffData = t.data.slice(startIx);
            coeffs = t.ARMaxEntropy({data : coeffData}); 
        } else{
            coeffData = t.data.slice(startIx,endIx);
            coeffs = t.ARMaxEntropy({data : coeffData, degree:degree});
        }
    
        
        var forecast = 0;
      
        for(var j=0; j<coeffs.length;j++)
        {
            // 10 represents the datapoint before the one we are trying to predict.
            // So in this cases our 10 is forecastDays-i.
            // Then we go to earlier times
            // So in this cases our -i is +j
            dataPointTest = t.data[N-1+i-j][1]
            forecast -= dataPointTest*coeffs[j]; // check
        }
   
        t.data[N+i][1] = forecast;
        
        //console.log(t.data);
       
       
    }
    var outDates = [];
    var outMetric = [];
    
    for(var i=0; i<L; i++)
    {
        var outDate = formatDate(t.data[i][0]);
        
        outDates.push(outDate);
        outMetric.push(t.data[i][1]);
    }
    
    var forecastDates = outDates.slice(-forecastDays-1).reverse();
    var forecastMetric = outMetric.slice(-forecastDays-1).reverse();
  
    var div = document.getElementById("t7");
    data = [
        {
            x: outDates.slice(0,-forecastDays),
            y: outMetric.slice(0,-forecastDays),
            title: "admissions real data"
        },
        {
            x: forecastDates,
            y: forecastMetric,
            title: "admissions predictions"
        }   
    ];
    
    //Plotly.newPlot(div, data);
    
    return [forecastDates, forecastMetric];   
}

function findBestSettings(dates, metric, maxPercent)
{
  // this function works for any timestep if dates are omitted.  
  var N = dates.length; // N is essentially the window size.
  data = [];
  for(var i = 0; i<N; i++)
  {
      data.unshift([dates[i],metric[i]])
  }
  
  var t = new ts.main(data);
  t.smoother({period: 20});

  var config = t.regression_forecast_optimize({maxPct: maxPercent});
  var degree = config.degree;
  var windowSize = config.sample;
  return [degree, windowSize];
}

function fullForecast(dates, metric, forecastDays,maxPercent=0.3)
{
    var [degree, windowSize] = findBestSettings(dates, metric,maxPercent);
    return forecast(dates,metric,forecastDays,degree,windowSize)
}

function ema(dates,metric, windowSize, smoothing=2) 
{
    // Calculates exponentital moving average
    // 1. Calculate SMA for windowSize
    // x1 x2 x3 x4. wS = 3.
    // ^^^^^^^^
    // SMA(x1,x2,x3)
    // 2. Calculate weighting.
    // For wS = 3 this would be W = smoothing/(wS + 1) = smoothing/4
    // 3. EMA_x4 = (x4-EMA_x3)*W + EMA_x3
    var subMetric;
    var subSum;
    
    var  endIx; // endIx is the index where our SMA is located.
    if(windowSize % 2 == 0)
    {
        var shift = windowSize + 1; 
        endIx = -windowSize/2; // endIx is the point after where S1 is located.
        subMetric = metric.slice(-shift);
        var fstPassArray = averager(subMetric, windowSize);
        subSum = (fstPassArray[0] + fstPassArray[1])/2;
    } else{
        endIx = -Math.floor(windowSize/2);
        subMetric = metric.slice(-windowSize);
        subSum = subMetric.reduce((a,b)=> (a+b))/windowSize;
    }
    
    // endIx doesn't make sense IMO
    var newMetric = metric.slice(0, endIx);
    var N = newMetric.length;
    var newDates = dates.slice(0, endIx); 
    var S1 = subSum;
    
    //var S1 = metric[0]; // The bigger the windowSize the more import S1 is.
    var outMetric = [S1];
    var weight = smoothing/(windowSize + 1);
    for(var i = 1; i<N; i++)
    {
        // ema_today = (value_today - ema_yesterday)*weight + ema_yesterday
        emaVal = (newMetric[N-i] - outMetric[0])*weight + outMetric[0]
        
        outMetric.unshift(emaVal);
    }
    
    
    return [newDates, outMetric]
}

function download(filename, text) {
    var element = document.createElement('a');
    element.setAttribute('href', 'data:text/plain;charset=utf-8,' + encodeURIComponent(text));
    element.setAttribute('download', filename);
  
    element.style.display = 'none';
    document.body.appendChild(element);
  
    element.click();
  
    document.body.removeChild(element);
  }


function findAllBestSettings(dataPairs, maxPct)
{
    var settings = {}
    var L = Object.keys(dataPairs).length;
    var i = 0;
    console.log(L + " metrics to process");
    for(metricName in dataPairs) {
        var progress = 100*i/L;
        console.log(progress + "%");
        i++;
        var metric = dataPairs[metricName]["metrics"];
        var date = dataPairs[metricName]["dates"];
        var [degree, windowSize] = findBestSettings(date,metric,maxPct);
        settings[metricName] = {};
        settings[metricName]["degree"] = degree;
        settings[metricName]["windowSize"] = windowSize;
    };
    const settingStore = JSON.stringify(settings);
    console.log(settings);
    return settingStore;
}

function inputConfig(dataPairs,config)
{
    fullData = dataPairs
    Object.keys(config).forEach((metricName) => {
        fullData[metricName]["degree"] = config[metricName]["degree"];
        fullData[metricName]["windowSize"] = config[metricName]["windowSize"];
    })
    return fullData;
}

function fullPlot(dataFull, windowSize) { 

    var title = "Tests per day"; //Deaths per day within 28 days of positive test";
    var metricName = "Tests per day";
    var div = document.getElementById("t1");
    var forecastDays = 50;
    plot(div, dataFull["testsD"], windowSize,windowSize, title, metricName,forecastDays);
    
    var title2 = "New cases per day";
    var metricName2 = "Cases per day";

    var div2 = document.getElementById("t2");
    plot(div2,dataFull["casesD"],windowSize,windowSize, title2, metricName2,forecastDays);
    
    var div3 = document.getElementById("t3");
    var title3 = "Cases per test per day";
    var metricName3 = "Normalised cases per day";
    plot(div3,dataFull["normalisedCasesD"],windowSize, windowSize, title3, metricName3,forecastDays);



    var div4 = document.getElementById("t4");
    var title4 = "People on ventilators per day";
    var metricName4 = "Daily ventilators";
    plot(div4, dataFull["ventilators"],windowSize,windowSize, title4, metricName4,forecastDays)
    
    var div5 = document.getElementById("t5");
    var title5 = "Hospital admissions per day";
    var metricName5 = "Daily admissions";


    plot(div5, dataFull["admissionsD"], windowSize, windowSize, title5, metricName5,forecastDays);
    
    var div6 = document.getElementById("t6");
    var title6= "Daily deaths";
    var metricName6 = "Daily deaths";

    plot(div6,dataFull["deathsD"], windowSize, windowSize, title6, metricName6, forecastDays);
    //plot(div6,dataFull["vaccinesD"],windowSize,windowSize,title6,metricName6,3)
   
}

function main() {
    
    
    const base = 'https://api.coronavirus.data.gov.uk/v1/data?'
    const AreaType = "overview";
    //const AreaName = "england";
    const filters = [ 
        "areaType=" + AreaType,
        //"areaName=" + AreaName
    ];

    const structure = {
        date: "date",
        name: "areaType",
        //areaName: "areaName",
        casesD: "newCasesByPublishDate",
        casesC: "cumCasesByPublishDate",
        deathsD: "newDeaths28DaysByPublishDate",
        deathsC: "cumDeaths28DaysByDeathDate",
        testsD: "newTestsByPublishDate",
        testsC: "cumTestsByPublishDate",
        pOneD:  "newPillarOneTestsByPublishDate",
        pOneC: "cumPillarOneTestsByPublishDate",
        pTwoD: "newPillarTwoTestsByPublishDate",
        pTwoC: "cumPillarTwoTestsByPublishDate",
        pThreeD: "newPillarThreeTestsByPublishDate",
        pThreeC: "cumPillarThreeTestsByPublishDate",
        pFourD: "newPillarFourTestsByPublishDate",
        pFourC: "cumPillarFourTestsByPublishDate",
        admissionsD: "newAdmissions",
        admissionsC: "cumAdmissions",
        cumulativeByAge: "cumAdmissionsByAge",
        ventilators: "covidOccupiedMVBeds",
        cases: "hospitalCases",
        capacity: "plannedCapacityByPublishDate",
        //vaccineD: "cumPeopleVaccinatedFirstDoseByPublishDate"
    };
    

    
    var url = buildUrl(base,filters,structure);
 
    // These are the keys to the structure object.     
    var metricNames =  ["casesD", "casesC", "deathsD",
                        "deathsC", "testsD", "testsC",
                        "pOneD", "pOneC", "pTwoD",
                        "pTwoC", "pThreeD", "pThreeC",
                        "pFourD", "pFourC" ,"ventilators",
                        "admissionsD", "admissionsC",];

    // No vacinne data  available sad.
    (async function () {
        
        var result = await getData(url);
        
        var response = JSON.parse(result.responseText);
        var data = response["data"];
        var dateEnd = "current";
        var dateStart = "2019-01-01";
    

        var metricArrays = new Map();
        for(var i = 0; i<data.length; i++) // start at 1 to avoid incomplete data.
        {
            day = data[i]
            var todaysDate = day.date; // this is the date for each entry in our array.
            
            if(!isDateBetween(todaysDate, dateStart, dateEnd))
            {
                continue; 
                // using continue not break because of changes to historical data.
                // ^ so data not necessarily in order.
            }
            if(!metricArrays.has(todaysDate)) // if not initialised then initialise.
            {
                metricArrays[todaysDate] = {}; 
                metricNames.forEach((metricName) => (metricArrays[todaysDate][metricName] = 0) ); // initialise all metricNames
                
            }
            
            
            metricNames.forEach((metricName) => metricArrays[todaysDate][metricName] += day[metricName]); 
            if(day.date == dateStart) // TODO: make this work for repeat data.
            {
                break
            }
        }
    
        // Any additional metric manipulation should happen below
        // ***
        
        var noramlisedCases = [];
        var dateKeys = Object.keys(metricArrays);
        var oldDates = dateKeys.map((v)=> v);

        var dataPairs = extractMultMetrics(metricArrays, metricNames); // structure is dataPairs[metric][dates/metrics]
        console.log(dataPairs)
        // normalised cases is casesD / testsD or 0 if testsD is 0
        var casesD = extractMetric(metricArrays, "casesD"); // note data pairs will have different length arrays so have to use this fn.
        var testsD = extractMetric(metricArrays, "testsD");
        
        var normCase;
        var normCases=[];
        for(var i =0; i<casesD.length; i++)
        {

            (testsD[i] == 0 ? normCase = 0 : normCase = casesD[i]/testsD[i])
            //console.log(normCase)
            normCases.push(normCase);
        }
        dataPairs["normalisedCasesD"] = {};
        dataPairs["normalisedCasesD"] = {};
        [dataPairs["normalisedCasesD"]["dates"], dataPairs["normalisedCasesD"]["metrics"]] = removeZeros(oldDates, normCases);
        
         // *** 

        // **** THESE LINES CAUSE WEBPAGE TO TAKE AGES TO LOAD
        // **** configStr should be loaded from "settings.json" download.
        //var forecastSettings = findAllBestSettings(dataPairs,0.1); // creates download to file which has stringifyed json in.
        //download("settings.json",forecastSettings);
        // ****
        // ****
        
        
        const config = {"casesD":{"degree":7,"windowSize":39},"casesC":{"degree":18,"windowSize":39},"deathsD":{"degree":9,"windowSize":36},"deathsC":{"degree":11,"windowSize":36},"testsD":{"degree":13,"windowSize":33},"testsC":{"degree":11,"windowSize":33},"pOneD":{"degree":6,"windowSize":33},"pOneC":{"degree":12,"windowSize":33},"pTwoD":{"degree":11,"windowSize":31},"pTwoC":{"degree":13,"windowSize":33},"pThreeD":{"degree":4,"windowSize":27},"pThreeC":{"degree":4,"windowSize":26},"pFourD":{"degree":9,"windowSize":33},"pFourC":{"degree":12,"windowSize":33},"ventilators":{"degree":6,"windowSize":33},"admissionsD":{"degree":13,"windowSize":33},"admissionsC":{"degree":10,"windowSize":33},"normalisedCasesD":{"degree":21,"windowSize":31}};
        var dataFull = inputConfig(dataPairs, config);
        var windowSize = 14;
        fullPlot(dataFull, windowSize);
     
        
        

        
       
    })()
   


}

main();





