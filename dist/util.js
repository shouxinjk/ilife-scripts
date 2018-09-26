//debug 
var debug=false;

//data api
var spi = 'https://data.shouxinjk.net/_db/sea/_api/document/';
var spi_query = 'https://data.shouxinjk.net/_db/sea/_api/simple/by-example';
var query=
    {
        collection: "my_stuff", 
        example: { 
            _key :null
        } 
    };

//auth
var auth = 'Basic aWxpZmU6aWxpZmU=';

//create a new seed
function commitUrl(data,callback){
     __postData("seeds", data,callback);
}

//create a new item
function commitData(data,callback){
    __postData("my_stuff", data,callback);
}

//get full url
function fullUrl(url) {
    var a = document.createElement('a');
    a.href = url;
    return a.href;
}

//pivate method
//check data and dispatch to create or update
function __postData(collection,data,callback){
    if(debug)console.log("check if data exists.[spi.url]"+spi+collection,"[data.url]"+data.url);
    var _key = hex_md5(data.url);
    var req = new XMLHttpRequest();
    query.collection = collection;
    query.example._key = _key;
    req.open('PUT', spi_query, true);//query to check if exists
    req.setRequestHeader('Content-Type', 'application/json');
    req.setRequestHeader('Authorization', auth);
    req.setRequestHeader('Api-Key', 'foobar');
    req.onreadystatechange = function() {
        if (req.readyState === 4) {
            if (req.status >= 200 && req.status < 400) {//got result
                var result = JSON.parse(req.responseText);
                if(debug)console.log(result,result.count);
                result.count === 0 ? __create(spi+collection,data,callback) : __update(spi+collection+"/"+_key,data,callback);
            } else {//query error
                if(debug)console.log(JSON.parse(req.responseText));
            }
        }
    };
    try{
        req.send(JSON.stringify(query));//put query
    }catch(e){
        if(debug)console.log("Error while checking data if exists."+e);
    }
}

//private method
//create a new document
function __create(url,data,callback){
    if(debug)console.log("create new document against "+url,data);
    var req = new XMLHttpRequest();
    req.open('POST', url, true);
    req.setRequestHeader('Content-Type', 'application/json');
    req.setRequestHeader('Authorization', auth);
    req.setRequestHeader('Api-Key', 'foobar');
    req.onreadystatechange = function() {
        if (req.readyState === 4) {
            if (req.status >= 200 && req.status < 400) {
                if(debug)console.log(JSON.parse(req.responseText));
            } else {
                // Handle error case
            }
            if(callback && typeof callback == 'function'){
                callback();
            }
        }
    };
    data._key = hex_md5(data.url);
    try{
        req.send(JSON.stringify(data));//post data
    }catch(e){
        if(debug)console.log("Error while update data to create new document."+e);
    }
}

//private method
//update an exist document
function __update(url,data,callback){
    if(debug)console.log("update exist document against "+url,data);
    var req = new XMLHttpRequest();
    req.open('PATCH', url, true);
    req.setRequestHeader('Content-Type', 'application/json');
    req.setRequestHeader('Authorization', auth);
    req.setRequestHeader('Api-Key', 'foobar');
    req.onreadystatechange = function() {
        if (req.readyState === 4) {
            if (req.status >= 200 && req.status < 400) {
                if(debug)console.log(JSON.parse(req.responseText));
            } else {
                // Handle error case
            }
            if(callback && typeof callback == 'function'){
                callback();
            }
        }
    };
    try{
        req.send(JSON.stringify(data));//post data
    }catch(e){
        if(debug)console.log("Error while update data to create new document."+e);
    }
}

function queryData(query,callback){
    __ajax(spi_query,query,"PUT",callback);
}

function querySeeds(){

}

//private method
//generl method
function __ajax(url,data,method="GET",callback){
    if(debug)console.log("AJAX "+url,data,method);
    var req = new XMLHttpRequest();
    req.open(method, url, true);
    req.setRequestHeader('Content-Type', 'application/json');
    req.setRequestHeader('Authorization', auth);
    req.setRequestHeader('Api-Key', 'foobar');
    req.onreadystatechange = function() {
        if (req.readyState === 4) {
            if (req.status >= 200 && req.status < 400) {
                if(callback && typeof callback == 'function'){
                    callback(JSON.parse(req.responseText));
                }
            } else {
                // Handle error case
            }
        }
    };
    try{
        req.send(JSON.stringify(data));//post data
    }catch(e){
        if(debug)console.log("AJAX error."+e);
    }
}