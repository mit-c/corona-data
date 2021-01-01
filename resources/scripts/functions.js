

function helloWorld(){
    var person = prompt("Enter Name");
    if(person != null)
    {
        // Have to define variables with var
        var greeting = "Welcome " + person + ".";
        // Can only getElement if element is defined before script tag.
        var p_greet = document.getElementById("greeting");
        // Use .innerHTML to change property
        
        p_greet.innerHTML = greeting;
        var title = document.getElementById("Title");
        var orig_title = title.innerHTML;
        title.innerHTML = orig_title + " for " + person;
        var myArray = ["banana", "apple", "pear", person];

        for(var i = 0; i<myArray.length; i++)
        {
            console.log(myArray[i]);
        }
        
        // Create simple one line functions as follows.
        print = val => console.log(val);
        // forEach is simple way to get each element.
        myArray.forEach(print);
        // For simple if/else statements
        var greetTim = person == "Tim" ? "greetings Tim":"greetings";
        console.log(greetTim); 

    } else if (person == null && (true && ~false))
    {
        console.log("person is null");
    }
    while(i<10)
    {
        console.log(i)
        i++;
    }
    console.log(myArray.includes("Tim"));
}

// seems to be a lot like c++.


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
    // 1 2 3 4 5 wS=3 numWindows = N - 2*Math.floor(windowSize/2),  start = 0, end= N-window_size 
    //   v v v
    // 1 2 3 4 5 6 7 8 wS = 4 numWindows = N + 1 - windowSize
    //    v v v v v 
    
    var N  = array.length;
}

function moving_average(dates, quantityArray, windowSize)
{
    // dates and quantityArray should be the same size.
    // If moving average window is even we would have to plot at mid point of dates.
    var N = quantityArray.length;
    if(N % 2 == 0)
    {
        // If N is even you smooth twice so you still land on a data point
        // 1 2 3 4 5 6 7 8 wS = 8
        //    v v v v v  wS = 4
        //     v v v v  wS = 4 but lands on 3 4 5 6 instead of 2.5 3.5 etc.
        //  if even we divide window size by 2 and do it twice
    } else {

    }
  
}



//https://api.coronavirus.data.gov.uk/v1/data?areaType=country,areaName=england[object

const main = () => {
    const base = 'https://api.coronavirus.data.gov.uk/v1/data?'
    const AreaType = "overview";
    //const AreaName = "UK";
    const Date = "2020-01-01";
    const filters = [ 
        "areaType=" + AreaType, 
        //"areaName=" + AreaName
        //,"date=" + Date
    ];

    const structure = {
        date: "date",
        name: "areaName",
        //code: "areaCode",
        cases: {
            daily: "newCasesBySpecimenDate",
            cumulative: "cumCasesBySpecimenDate"
        },
        deaths: {
            daily: "newDeathsByDeathDate",
            cumulative: "cumDeathsByDeathDate",

        },
        tests: {
            daily: "newTestsByPublishDate",
            cumulative: "cumTestsByPublishDate",
            testsP1: {
                daily: "newPillarOneTestsByPublishDate",
                cumulative: "cumPillarOneTestsByPublishDate"
            },
            testsP2: {
                daily: "newPillarTwoTestsByPublishDate",
                cumulative: "cumPillarTwoTestsByPublishDate"
            },
            testsP3: {
                daily: "newPillarThreeTestsByPublishDate",
                cumulative: "cumPillarThreeTestsByPublishDate"
            },
            testsP4: {
                daily: "newPillarFourTestsByPublishDate",
                cumulative: "cumPillarFourTestsByPublishDate"
            }
        },
        hospitals: {
            daily: "newAdmissions",
            cumulative: "cumAdmissions",
            cumulativeByAge: "cumAdmissionsByAge",
            ventilator: "covidOccupiedMVBeds",
            cases: "hospitalCases",
            capacity: "plannedCapacityByPublishDate"

        }
    };
    
    // Two ways of doing it.
    // 1st way is apparently best practice.
    var url = buildUrl(base,filters,structure);
    (async function () {
        var result = await getData(url);
        var response = JSON.parse(result.responseText);
        var data = response["data"];
        console.table(data);
        var dates = [];
        var cases_d = [];
        var cases_c = [];
        var deaths_d = [];
        var deaths_c = [];
        var tests_d = [];
        var tests_c = []
        var ventilators = []
        data_list = [cases_d,cases_c,deaths_d,deaths_c]

        for(var i = 1; i<data.length; i++) // start at 1 to avoid incomplete data.
        {
            day = data[i]
            dates.push(day.date);
            cases_d.push(day.cases.daily);
            cases_c.push(day.cases.cumulative);
            deaths_d.push(day.deaths.daily);
            deaths_c.push(day.deaths.cumulative);
            var testsP1 = day.tests.testsP1;
            var testsP2 = day.tests.testsP2;
            var testsP3 = day.tests.testsP3;
            var testsP4 = day.tests.testsP4;
            tests_d.push(testsP1.daily + testsP2.daily + testsP4.daily + testsP3.daily);
            tests_c.push(testsP1.cumulative + testsP2.cumulative + testsP4.cumulative);
            ventilators.push(day.hospitals.ventilator);
        }

        t1 = document.getElementById("t1");
        console.log(t1);
        var dataToPlot = [
            {
                x: dates,
                y: tests_d,
                type: "bar"
            }  
        ]
        Plotly.newPlot(t1, dataToPlot);
        pre_tag = document.getElementById("data");
        //pre_tag.innerHTML = JSON.stringify(data,undefined,2);
        
        
        
    })()
    /*
    getData(url).then(function(xhttp) {
        document.getElementById("data").innerHTML += xhttp.responseText;
    });
    */
    

}

