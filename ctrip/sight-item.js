// ==UserScript==
// @name         CTrip places item:s
// @namespace    http://tampermonkey.net/
// @version      0.9
// @description  extrac sight items
// @author       qchzhu
// @require http://code.jquery.com/jquery-latest.js
// @require http://118.190.75.121/dist/waitForKeyElements.js
// @require http://118.190.75.121/dist/md5.js
// @match        http://you.ctrip.com/sight/*
// @match        http://you.ctrip.com/countrysightlist/*
// @grant        none
// ==/UserScript==

var debug=false;
var spi = 'https://data.shouxinjk.net/_db/sea/_api/document/items';
var itemCount = 15;//每一页最大条数，根据此数值判定是否翻页；
var itemCollected = 0;//已采集条数
waitForKeyElements ("div.list_mod2", extactData);//如果是城市place，通过mod2显示所有景点

function extactData (jNode) {
    'use strict';
    var title=jNode.find('.rdetailbox dl dt a').attr("title");
    var image = jNode.find('.leftimg a img').attr("src");
    var url = document.location.protocol+"//"+document.location.host+jNode.find('.leftimg a').attr("href");
    var type = jNode.find('.rdetailbox dl dt i').attr("class");
    var priceListed = jNode.find('del').text().replace(/\s*/g,"");
    var pricePromote = jNode.find('span.price').text().replace(/\s*/g,"");
    var address = jNode.find('.rdetailbox dl dd.ellipsis').text().replace(/\s*/g,"");
    var score = jNode.find('.rdetailbox ul.r_comment li a.score strong').text().replace(/\s*/g,"");
    var comments = jNode.find('.rdetailbox ul.r_comment li a.recomment').text().replace(/[^\d]/g,"");
    var rankArray = jNode.find('.rdetailbox dl dd.ellipsis').next().text().replace(/\s*/g,"").split("|");
    var rank = rankArray.length>1 ? rankArray[0] :"";

    //获取国家、省州、城市标注
    var place = "";
    $("i.icon_gt").each(function(index){
        place += " "+$(this).parent().children("a").text().replace(/\s*/g,"").replace(/目的地/g,"").replace(/旅游攻略社区/g,"");
    });

    var data={
        "type":type,
        "place":place.trim(),
        "title":title,
        "image":image,
        "url":url,
        "pricePrint":priceListed,
        "pricePromote":pricePromote,
        "comments":comments,
        "address":address,
        "rank":rank,
        "score":score,
        "taskList":document.location.href
    };
    if(debug)console.log(data);
    itemCollected++; //增加已采集条数计数
    postData(data);//发送数据
}

//create a new seed
function postData(data){
    var req = new XMLHttpRequest();
    //step 1: create a new document
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
            if(itemCollected >= itemCount){//判定是否已采集完成，如果已完成则进入下一页
                var delayMills = 1000+Math.floor(Math.random() * 3000);//注意：需要控制采集频率
                //if(!debug)setTimeout(goNextPage,delayMills);
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

//TODO 从服务器端获取下一个URL，并自动跳转
function goNextPage(){
    itemCollected = 0;
    window.location.href=document.location.protocol+"//"+document.location.host+$("a.nextpage").attr("href");
}

