//debug 
var debug=true;

//data api
var spi = 'https://data.shouxinjk.net/_db/sea/_api/document/';
//auth
var auth = 'Basic aWxpZmU6aWxpZmU=';

//create a new seed
function commitUrl(data,callback){
	var url = spi + "seeds";
	__postData(url, data,callback);
}

//create a new item
function commitData(data,callback){
	var url = spi + "items";
	__postData(url, data,callback);
}

//pivate method
//check data and dispatch to create or update
function __postData(url,data,callback){
    console.log("check if data exists.[spi]"+url,"[data.url]"+data.url);
    var _key = hex_md5(data.url);
    var req = new XMLHttpRequest();
    req.open('GET', url+"/"+_key, true);//query to check if exists
    req.setRequestHeader('Content-Type', 'application/json');
    req.setRequestHeader('Authorization', auth);
    req.setRequestHeader('Api-Key', 'foobar');
    req.onreadystatechange = function() {
        if (req.readyState === 4) {
            if (req.status >= 200 && req.status < 400) {//yes the item exists
                if(debug)console.log(JSON.parse(req.responseText));
                __update(url+"/"+_key,data,callback);
            } else {//no the item does not exist
                if(debug)console.log(JSON.parse(req.responseText));
                __create(url,data,callback);
            }
        }
    };
    try{
        req.send(JSON.stringify(data));//post data
    }catch(e){
        if(debug)console.log("Error while checking data if exists."+e);
    }
}

//private method
//create a new document
function __create(url,data,callback){
    console.log("create new document against "+url,data);
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
    console.log("update exist document against "+url,data);
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