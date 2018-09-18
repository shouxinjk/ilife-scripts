//debug 
var debug=false;

//data api
var spi = 'https://data.shouxinjk.net/_db/sea/_api/document/';

//create a new seed
function commitUrl(data,callback){
	var url = spi + "seeds";
	postData(url, data,callback);
}

//create a new item
function commitData(data,callback){
	var url = spi + "items";
	postData(url, data,callback);
}

function postData(url,data,callback){
    console.log("check if data exists.[spi]"+url,"[data.url]"+data.url);
    var _key = hex_md5(data.url);
    var req = new XMLHttpRequest();
    req.open('GET', url+"/"+_key, true);//query to check if exists
    req.setRequestHeader('Content-Type', 'application/json');
    req.setRequestHeader('Authorization', 'Basic aWxpZmU6aWxpZmU=');
    req.setRequestHeader('Api-Key', 'foobar');
    req.onreadystatechange = function() {
        if (req.readyState === 4) {
            if (req.status >= 200 && req.status < 400) {//yes the item exists
                if(debug)console.log(JSON.parse(req.responseText));
                update(url+"/"+_key,data,callback);
            } else {//no the item does not exist
                create(url,data,callback);
            }
        }
    };
    
}

//this is a private method
//TODO: create a new one or update for an exist item
function create(url,data,callback){
    console.log("create new document against "+url,data);
    var req = new XMLHttpRequest();
    req.open('POST', url, true);
    req.setRequestHeader('Content-Type', 'application/json');
    req.setRequestHeader('Authorization', 'Basic aWxpZmU6aWxpZmU=');
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

function update(url,data,callback){
    console.log("update exist document against "+url,data);
    var req = new XMLHttpRequest();
    req.open('PATCH', url, true);
    req.setRequestHeader('Content-Type', 'application/json');
    req.setRequestHeader('Authorization', 'Basic aWxpZmU6aWxpZmU=');
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