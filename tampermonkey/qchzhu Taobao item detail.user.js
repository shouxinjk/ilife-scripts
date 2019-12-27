// ==UserScript==
// @name         qchzhu Taobao item detail
// @namespace    http://tampermonkey.net/
// @version      0.1
// @description  try to take over the world!
// @author       You
// @require http://code.jquery.com/jquery-latest.js
// @require http://cdnjs.cloudflare.com/ajax/libs/json3/3.3.2/json3.min.js
// @require http://118.190.75.121/list/js/jsonhttprequest.min.js
// @require http://118.190.75.121/dist/waitForKeyElements.js
// @require http://118.190.75.121/dist/md5.js

//https://gist.github.com/raw/2625891/waitForKeyElements.js
// @match        https://item.taobao.com/item*
// @grant        none
// ==/UserScript==

//extract item detail
//https://item.taobao.com/item.htm?spm=a219r.lm5734.14.324.581d86fbFmejKL&id=565630134195&ns=1&abbucket=1#detail
//https://item.taobao.com/item.htm?spm=a219r.lm895.14.1.ac0244e7iorfYK&id=44889671704&ns=1&abbucket=1
var debug=true;
var data={};
var timerId = setInterval(extractItem, 500);
var timesWaitMax = 5000;
var timesWait = 0;
var spiThings = 'https://data.shouxinjk.net/_db/sea/beautiful/things/';
var spiSeeds = 'https://data.shouxinjk.net/_db/sea/lotof/seeds/'

waitForKeyElements ("ul.attributes-list", extractProps);
waitForKeyElements ("div.shop-summary", extractShop);
waitForKeyElements ("a[shortcut-effect='click'] em.J_ReviewsCount",triggerClickComments);//doesnt work
waitForKeyElements ("ul.kg-rate-wd-impression", extractComments);

function extractShop (jNode) {
    if(debug)console.log("start extract shop...");
    'use strict';
    var shopName=jNode.find("a.shop-name-link").text().replace(/\s/g,'');
    var shopRank=jNode.find("span.shop-rank a").attr("class");

    //qualifications
    var shopQualification=new Array();
    jNode.find("span.qualification a").each( function() {
        var title = $(this).attr("title");
        var qualifications = $(this).attr("class").split(" ");//here we use the latest one as ID
        var item={
            "title":title,
            "qualification":qualifications[qualifications.length-1]
        }
        shopQualification.push(item);
    });

    //service info
    var services=new Array();
    jNode.find("li.shop-service-info-item").each( function() {
        var title = $(this).find("span.title").text().replace(/\s/g,'');
        var rate = $(this).find("span.rateinfo").text().replace(/\s/g,'');
        var typeArray = $(this).find("span.rateinfo i").attr("class").split(" ");
        var item={
            "title":title,
            "rate":rate,
            "type":typeArray[typeArray.length-1]
        }
        services.push(item);
    });

    var shop={
        "name":shopName,
        "rank":shopRank,
        "qualifications":shopQualification,
        "services":services
    }
    data.shop=shop;
    if(debug)console.log(shop);
    if(debug)console.log(data);
}

function extractItem () {
    if(debug)console.log("start extract item...");
    'use strict';

    //extract item
    var title = $("#J_Title h3.tb-main-title").text();
    var modPrice = $("#J_StrPrice em.tb-rmb-num").text();
    var promoPrice = $("#J_PromoPriceNum").text();
    var rateCount = $("#J_RateCounter").text();
    var sellCount = $("#J_SellCounter").text();
    var imgUrl = $("#J_ImgBooth").attr("src");

    if(promoPrice.replace(/\s/g,'').length==0 || rateCount.replace(/-/g,'').length==0 || sellCount.replace(/-/g,'').length==0){//we do not get real price
        if(debug)console.log("cannot get price. continue ...");
        timesWait += 500;
        if(timesWait > timesWaitMax){//timeout then quit
            clearInterval(timerId);
            getNextItem();
        }
    }else{//we got price
        data.title = title.replace(/\s/g,'');
        data.modPrice = modPrice;
        data.promoPrice = promoPrice;
        data.rateCount = rateCount;
        data.sellCount = sellCount;
        data.url = document.location.href;
        data.image = document.location.protocol+imgUrl;
        data.id = document.location.search.match(/id=(\d+)/)[1];
        //data._key = document.location.search.match(/id=(\d+)/)[1];
        if(debug)console.log(data);
        //if(debug)console.log("try to click comments");
        triggerClickComments($("a[shortcut-effect='click'] em.J_ReviewsCount"));//we have to wait because comments tab was ajax loaded.

        clearInterval(timerId);
    }
}

function triggerClickComments (jNode) {
    if(debug)console.log("now start trigger comments tab...");
    'use strict';
    //trigger a click event to extract comment data
    var eClick = jQuery.Event( "click" );
    jNode.trigger( eClick );
    //jNode.trigger("click");
}

function extractProps (jNode) {
    if(debug)console.log("start extract props...");
    'use strict';
    var props=new Array();
    jNode.find("li").each( function() {
        var prop = $(this).text().replace(/:\s/g,':').split(":");
        props.push({
            "prop":prop[0],
            "value":prop[1]
        });
    });
    data.props=props;
    if(debug)console.log(props);
    if(debug)console.log(data);
}

//notice: this will be triggered by a click operation
function extractComments (jNode) {
    if(debug)console.log("start extract comments...");
    'use strict';
    var comments=new Array();
    jNode.find("li a").each( function() {
        var neg = $(this).attr("data-neg");//1 for good, -1 for bad
        var text = $(this).text().replace(/\(|\)/g,'').split(" ");
        var comment={
            "text":text[0],
            "data-neg":neg,
            "count":text[1]
        }
        comments.push(comment);
    });
    data.comments = comments;
    if(debug)console.log(comments);
    if(debug)console.log(data);
    createDocument();
}

function patchDocument(documentId){
    var req = new XMLHttpRequest();
    //step 2: update data
    req.open('PATCH', spiThings+documentId, true);
    req.setRequestHeader('Content-Type', 'application/json');
    req.setRequestHeader('Api-Key', 'foobar');
    req.onreadystatechange = function() {
        if (req.readyState === 4) {
            if (req.status >= 200 && req.status < 400) {
                if(debug)console.log(JSON.parse(req.responseText));
                //now we navigate to next item to extract
                getNextItem();
            } else {
                // Handle error case
            }
        }
    };
    if(debug)console.log(data);
    req.send(JSON.stringify(data));
}

function createDocument(){
    var req = new XMLHttpRequest();
    //step 1: create a new document
    req.open('POST', spiThings, true);
    req.setRequestHeader('Content-Type', 'application/json');
    req.setRequestHeader('Api-Key', 'foobar');
    req.onreadystatechange = function() {
        if (req.readyState === 4) {
            if(debug)console.log(JSON.parse(req.responseText));
            if (req.status >= 200 && req.status < 400) {//the document created successfully.
                // JSON.parse(req.responseText) etc.
                patchDocument(JSON.parse(req.responseText)._key);
            } else {
                if(req.status==409){//document exists then update
                    patchDocument(getItemId());
                }
                // Handle error case
            }
        }
    };
    try{
        req.send(JSON.stringify({_key:getItemId()}));//we post nothing for create a new document
    }catch(e){
        if(debug)console.log("Error while post data to create new document."+e);
    }
}

function getItemId(){
    return hex_md5(data.url);
}

function getNextItem(){
    //TODO we get next URL to extract
    //TODO server side should provide url filter
    //list all seeds, then choose one to extract
    var req = new XMLHttpRequest();
    //step 1: list all seeds
    req.open('GET', spiSeeds, true);
    req.setRequestHeader('Content-Type', 'application/json');
    req.setRequestHeader('Api-Key', 'foobar');
    req.onreadystatechange = function() {
        if (req.readyState === 4) {
            if(debug)console.log(JSON.parse(req.responseText));
            if (req.status >= 200 && req.status < 400) {//the document created successfully.
                // JSON.parse(req.responseText) etc.
                var totalSeeds = JSON.parse(req.responseText).length;
                var seedIndex = getRandomInt(totalSeeds-1);
                //extract item randomly
                if(debug)console.log("[try to extact url ]"+seedIndex+" of "+totalSeeds);
                if(debug)console.log(JSON.parse(req.responseText)[seedIndex]);
                if(debug)console.log(JSON.parse(req.responseText)[seedIndex].url);
                document.location.href=JSON.parse(req.responseText)[seedIndex].url;
            } else {
                // Handle error case
            }
        }
    };
    try{
        req.send(null);
    }catch(e){
        if(debug)console.log("Error while loading seeds."+e);
    }
}

function getRandomInt(max) {
  return Math.floor(Math.random() * Math.floor(max));
}
