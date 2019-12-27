// ==UserScript==
// @name         ilife_自动打标签
// @namespace    http://tampermonkey.net/
// @version      1.0
// @description  extract hotel
// @author       qchzhu
// @require http://code.jquery.com/jquery-latest.js
// @require http://118.190.75.121/dist/waitForKeyElements.js
// @require http://118.190.75.121/dist/md5.js
// @require http://118.190.75.121/dist/util.js?v=2.4
// @match        http://www.shouxinjk.net/list-admin/info.html*
// @grant        none
// ==/UserScript==

//示例URL
//http://www.shouxinjk.net/list-admin/info.html?category=0&id=8fd058c2ba41b51380f393d3658c9a1f
this.$ = this.jQuery = jQuery.noConflict(true);//important: to remove jQuery conflict

(function() {
    'use strict';
    waitForKeyElements ("#title:parent", tagging);
})();

function tagging(jNode){
    var tags = null;
    //优先使用tags最后一个填充
    var tagEl = $("tag:last");
    if(tagEl)tags = tagEl.text().trim();
    if(tags == null || tags.trim().length==0){//如果tags为空，则通过分割title得到
        var titleArr = jNode.text().split(" ");
        tags = titleArr[titleArr.length-1];
    }

    $("#tagging").val(tags);
    $("#indexbtn").trigger("click");
}




