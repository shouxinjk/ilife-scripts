// ==UserScript==
// @name         ilife-手动采集
// @namespace    http://tampermonkey.net/
// @version      1.0
// @description  extract books
// @author       qchzhu
// @require http://code.jquery.com/jquery-latest.js
// @require http://118.190.75.121/dist/waitForKeyElements.js
// @require http://118.190.75.121/dist/md5.js
// @require http://118.190.75.121/dist/util.js?v=3.0
// @icon    http://www.shouxinjk.net/favicon.ico
// @include        *
// @grant        none
// ==/UserScript==

//在界面生成一个悬浮按钮，点击后获取下一个链接并进行采集

//this.$ = this.jQuery = jQuery.noConflict(true);//important: to remove jQuery conflict

var debug = false;

(function() {
    'use strict';
    waitForKeyElements ("body", showButton);
    //waitForKeyElements ("div:first", showButton2);
})();

function showButton(jNode){
    var html = "<div id='ilife-go-next' style='position:absolute;z-index:999;top:20px;left:20px;background-color:darkred;color:white;font-size:16px;font-weight:bold;line-height:60px;width:60px;height:60px;border-radius:30px;text-align:center;'>Go</div>";
    jNode.append(html);
console.log("\n\n register click event ...");
    //注册点击事件
    $("#ilife-go-next").click(next);
}

function showButton2(jNode){
    var html = "<div id='ilife-go-next' style='position:absolute;z-index:9999;top:20px;left:20px;background-color:darkgreen;color:white;font-size:16px;font-weight:bold;line-height:60px;width:60px;height:60px;border-radius:30px;text-align:center;'>Go</div>";
    jNode.append(html);
console.log("\n\n register click event ...");
    //注册点击事件
    $("#ilife-go-next").click(next);
}

//navigate to next url
function next(){
    console.log("\n\n fetch next ...");
    if(  !debug ){_next();}
}




