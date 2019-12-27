// ==UserScript==
// @name         qchzhu Taobao item list
// @namespace    http://tampermonkey.net/
// @version      0.1
// @description  try to take over the world!
// @author       You
// @require http://code.jquery.com/jquery-latest.js
// @require http://118.190.75.121/dist/waitForKeyElements.js
// @require http://118.190.75.121/dist/md5.js
// @match        https://s.taobao.com/list*
// @grant        none
// ==/UserScript==

//extract item list
//https://s.taobao.com/list?q=%E6%B3%95%E5%BC%8F+%E5%86%85%E8%A1%A3&cat=1625&style=grid&seller_type=taobao&spm=a219r.lm5734.1000187.1
//https://s.taobao.com/list?spm=a217m.8316598.313651-static.1.638a33d5Zw4XSf&q=%E5%A4%96%E5%A5%97&cat=50344007&style=grid&seller_type=taobao
waitForKeyElements (".item.J_MouserOnverReq", actionFunction);

var debug=true;
var spi = 'https://data.shouxinjk.net/_db/sea/lotof/seeds/';
function actionFunction (jNode) {
    'use strict';
    var title=jNode.find('.pic a img').attr("alt");
    var image = jNode.find('.pic a img');
    var imageUrl = document.location.protocol+image.attr("data-src");
    var imageHeight = image.naturalHeight;
    var imageWidth = image.naturalWidth;
    image.onload = function(){
        if(debug)console.log('width:'+image.naturalWidth+',height:'+image.naturalHeight);
    };
    var url = document.location.protocol+jNode.find('.pic a').attr("data-href");
    var price = jNode.find('.pic a').attr("trace-price");
    var deals = jNode.find('.deal-cnt').text().replace(/人付款/g,"");
    var shop = jNode.find('.shop .shopname').text().trim();
    var location = jNode.find('.location').text();
    var ship = jNode.find('.ship.icon-service-free')?"free":"paid";
    var services = "";
    jNode.find("span[class^='icon-service-']").each( function() {
        services = services + " ";
        services = services + $(this).attr('class').replace(/icon-service-/g,"");
    });
    var data={
        "title":title,
        "image":{
            "url":imageUrl,
            "height":imageHeight,
            "width":imageWidth
        },
        "url":url,
        "price":price,
        "deals":deals,
        "shop":shop,
        "location":location,
        "ship":ship,
        "services":services
    }
    if(debug)console.log(data);
    createDocument(data.url,data);
}

//update seed info
function patchDocument(documentId,seed){
    var req = new XMLHttpRequest();
    //step 2: update data
    req.open('PATCH', spi+documentId, true);
    req.setRequestHeader('Content-Type', 'application/json');
    req.setRequestHeader('Api-Key', 'foobar');
    req.onreadystatechange = function() {
        if (req.readyState === 4) {
            if (req.status >= 200 && req.status < 400) {
                if(debug)console.log(JSON.parse(req.responseText));
                //now we navigate to next item to extract
                console.log("we do not extract more list url:s now.");
                //getNextItem();
            } else {
                // Handle error case
            }
        }
    };
    if(debug)console.log(seed);
    req.send(JSON.stringify(seed));
}

//create a new seed
function createDocument(url,seed){
    var req = new XMLHttpRequest();
    //step 1: create a new document
    req.open('POST', spi, true);
    req.setRequestHeader('Content-Type', 'application/json');
    req.setRequestHeader('Api-Key', 'foobar');
    req.onreadystatechange = function() {
        if (req.readyState === 4) {
            if(debug)console.log(JSON.parse(req.responseText));
            if (req.status >= 200 && req.status < 400) {//the document created successfully.
                // JSON.parse(req.responseText) etc.
                patchDocument(JSON.parse(req.responseText)._key,seed);
            } else {
                if(req.status==409){//document exists then update
                    patchDocument(getItemId(url),seed);
                }
                // Handle error case
            }
        }
    };
    try{
        req.send(JSON.stringify({_key:getItemId(url)}));//we post nothing for create a new document
    }catch(e){
        if(debug)console.log("Error while post data to create new document."+e);
    }
}

function getItemId(url){
    return hex_md5(url);
}


