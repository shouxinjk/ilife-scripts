// ==UserScript==
// @name         CTrip sight url:s
// @namespace    http://tampermonkey.net/
// @version      0.9
// @description  extract sight urls
// @author       qchzhu
// @require http://code.jquery.com/jquery-latest.js
// @require http://118.190.75.121/dist/waitForKeyElements.js
// @require http://118.190.75.121/dist/md5.js
// @match        http://you.ctrip.com/sight/*
// @match        http://you.ctrip.com/countrysightlist/*
// @grant        none
// ==/UserScript==

var debug=false;//是否调试
var spi = 'https://data.shouxinjk.net/_db/sea/_api/document/seeds';//提交地址
waitForKeyElements ("a[href^='/sight/']", extractUrl);//获取所有景点地址

function extractUrl (jNode){
    var url = document.location.protocol+"//"+document.location.host + jNode.attr("href");
    var type = "sight";
    var data={
        "type":type,
        "taskUrl":document.location.href,
        "url":url
    };
    if(debug)console.log(data);
    postData(data);//发送数据
}

//create a new seed
function postData(data){
    var req = new XMLHttpRequest();
    req.open('POST', spi, true);
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
        }
    };
    data._key = hex_md5(data.url);
    try{
        req.send(JSON.stringify(data));//post data
    }catch(e){
        if(debug)console.log("Error while post data to create new document."+e);
    }
}


