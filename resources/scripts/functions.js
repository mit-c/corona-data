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
const { SSL_OP_SSLEAY_080_CLIENT_DH_BUG } = require('constants');

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

function plot(div, dates, metricToPlot, windowSize,emaWindowSize, titleName, metricName, forecastDays)
{

    var [movingDates, movingArray] = sma(dates,metricToPlot, windowSize);
    var [emaMovingDates,emaMovingArray] = ema(dates, metricToPlot, emaWindowSize);

  

    var dataToPlot = [
        {
            x: dates,
            y: metricToPlot,
            type: "bar",
            name: metricName,
            marker: {
                color: "#2EE092"
            }
        },
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
        }
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
        }
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
    storage["dates"]={};
    storage["metrics"]={};
    metricNames.forEach(metricName => {

        
        var metric = extractMetric(metricArrays,metricName);
    
        var [newDates,newMetric] = removeZeros(dates,metric);

        storage["dates"][metricName] = newDates;
        storage["metrics"][metricName] = newMetric; 
    })
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

function forecast(dates,metric,forecastDays)
{
    // this function works for any timestep if dates are omitted.
    var latestDate = new Date(dates[0]);
    latestDate.setUTCDate(latestDate.getUTCDate() + 1);
   
    var forecastToDate =  new Date(dates[0]);
    forecastToDate.setUTCDate(forecastToDate.getUTCDate() + forecastDays );
    
    var datesToAdd = dateRange(latestDate,forecastToDate, 1);
    
    var data = [];
    var N = dates.length
    
    for(var i = 0; i<N; i++)
    {
        data.unshift([dates[i],metric[i]])
    }
    
    var t = new ts.main(data);
    
    console.log(t.chart())
    for(var i =0; i<forecastDays; i++)
    {
        t.data.push([datesToAdd[i],0]);
    }

    
    console.log(t.chart())
    
    

    var coeffs;
    var L = t.data.length;
    
    var startIx, endIx;
    var degree = 5;
    console.log("N",N)
    for(var i=0; i<forecastDays; i++)
    {
        startIx = i;
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
        console.log("coeffData",coeffData);
        
        var forecast = 0;
        console.log("start inputing into data","predicting", N+i)
        for(var j=0; j<coeffs.length;j++)
        {
            // 10 represents the datapoint before the one we are trying to predict.
            // So in this cases our 10 is forecastDays-i.
            // Then we go to earlier times
            // So in this cases our -i is +j
            dataPointTest = t.data[N-1+i-j][1]
            console.log("dataPointTest",dataPointTest)
            forecast -= dataPointTest*coeffs[j]; // check
        }
        console.log("forecast", forecast)
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
    
    var forecastDates = outDates.slice(-forecastDays-1);
    var forecastMetric = outMetric.slice(-forecastDays-1);
  
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
    
    Plotly.newPlot(div, data);
    
    return [outDates.slice(0,forecastDays), outMetric.slice(0,forecastDays)];


   
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
        capacity: "plannedCapacityByPublishDate"
    };
    

    
    var url = buildUrl(base,filters,structure);
 
    // These are the keys to the structure object.     
    var metricNames =  ["casesD", "casesC", "deathsD",
                        "deathsC", "testsD", "testsC",
                        "pOneD", "pOneC", "pTwoD",
                        "pTwoC", "pThreeD", "pThreeC",
                        "pFourD", "pFourC" ,"ventilators",
                        "admissionsD", "admissionsC"]; 

    

    (async function () {
        
        var result = await getData(url);
        
        var response = JSON.parse(result.responseText);
        var data = response["data"];
        var dateEnd = "current";
        var dateStart = "2019-01-01";
    

        var metricArrays = new Map();
        for(var i = 1; i<data.length; i++) // start at 1 to avoid incomplete data.
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

        var dataPairs = extractMultMetrics(metricArrays, metricNames);
        
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
        [dataPairs["dates"]["normalisedCasesD"], dataPairs["metrics"]["normalisedCasesD"]] = removeZeros(oldDates, normCases);
        



        // *** 
        var dates = dataPairs["dates"]
        var metrics = dataPairs["metrics"];
        
        var windowSize = 25;
        var title = "Tests per day"; //Deaths per day within 28 days of positive test";
        var metricName = "Tests per day";
        var div = document.getElementById("t1");
        
        plot(div, dates["testsD"], metrics["testsD"], windowSize,windowSize, title, metricName);
        
        var title2 = "New cases per day";
        var metricName2 = "Cases per day";

        var div2 = document.getElementById("t2");
        plot(div2,dates["casesD"],metrics["casesD"],windowSize,windowSize, title2, metricName2);
       
        var div3 = document.getElementById("t3");
        var title3 = "Cases per test per day";
        var metricName3 = "Normalised cases per day";
        plot(div3,dates["normalisedCasesD"],metrics["normalisedCasesD"],windowSize, windowSize, title3, metricName3);



        var div4 = document.getElementById("t4");
        var title4 = "People on ventilators per day";
        var metricName4 = "Daily ventilators";
        plot(div4, dates["ventilators"], metrics["ventilators"],windowSize,windowSize, title4, metricName4)
        
        var div5 = document.getElementById("t5");
        var title5 = "Hospital admissions per day";
        var metricName5 = "Daily admissions";
        [arimaDates,arimaMetric] = forecast(dates["ventilators"].slice(0),metrics["ventilators"].slice(0),14); // need to implement this prediction in plot I think.
        console.log(arimaDates,arimaMetric);
        var div6 = document.getElementById("t6");
        plot(div6,arimaDates,arimaMetric,7,7,"arimaPredictAdmissions","admissions")
        
        plot(div5, dates["admissionsD"], metrics["admissionsD"], windowSize, windowSize, title5, metricName5);
        
       
    })()

    var store = {name: "tim", name: "tom"};
   


}
// This is a comment
main();





