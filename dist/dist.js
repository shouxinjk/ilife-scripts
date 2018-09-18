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

//this is a private method
//TODO: create a new one or update for an exist item
function postData(url,data,callback){
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
        if(debug)console.log("Error while post data to create new document."+e);
    }
}