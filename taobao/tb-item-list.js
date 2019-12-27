// ==UserScript==
// @name         qchzhu Taobao item list
// @namespace    http://tampermonkey.net/
// @version      0.1
// @description  try to take over the world!
// @author       You
// @require http://code.jquery.com/jquery-latest.js
// @require https://gist.github.com/raw/2625891/waitForKeyElements.js
// @match        https://s.taobao.com/list*
// @grant        none
// ==/UserScript==

//extract item list
//https://s.taobao.com/list?q=%E6%B3%95%E5%BC%8F+%E5%86%85%E8%A1%A3&cat=1625&style=grid&seller_type=taobao&spm=a219r.lm5734.1000187.1
//https://s.taobao.com/list?spm=a217m.8316598.313651-static.1.638a33d5Zw4XSf&q=%E5%A4%96%E5%A5%97&cat=50344007&style=grid&seller_type=taobao
waitForKeyElements (".item.J_MouserOnverReq", actionFunction);

function actionFunction (jNode) {
    'use strict';
    var title=jNode.find('.pic a img').attr("alt");
    var image = document.location.protocol+jNode.find('.pic a img').attr("data-src");
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
        "image":image,
        "url":url,
        "price":price,
        "deals":deals,
        "shop":shop,
        "location":location,
        "ship":ship,
        "services":services
    }
    console.log(data);
}

