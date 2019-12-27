// ==UserScript==
// @name         携程URL-线路
// @namespace    http://tampermonkey.net/
// @version      1.0
// @description  extract vacation urls
// @author       qchzhu
// @require http://code.jquery.com/jquery-latest.js
// @require http://118.190.75.121/dist/waitForKeyElements.js
// @require http://118.190.75.121/dist/md5.js
// @require http://118.190.75.121/dist/util.js?v=2.5
// @icon    http://www.shouxinjk.net/favicon.ico
// @match        http://vacations.ctrip.com/tours/*
// @grant        none
// ==/UserScript==

//示例URL
//http://vacations.ctrip.com/tours/d-lijiang-32#base_bda
if(this.jQuery){
    this.$ = this.jQuery = jQuery.noConflict(true);//important: to remove jQuery conflict
}

var debug = false;

var schema={
//TODO: validate and commit
};

//注意：由于对象是引用关系，不能直接使用JSON模板赋值，需要转换为String基本类型后重新解析为新的JSON对象
var tpl = JSON.stringify({//an example for extract urls
    task:{
        user:"userid",//注册的编码
        executor:"machine",//机器标识
            timestamp:new Date().getTime(),//时间戳
            url:window.location.href//原始浏览地址
    },
    source:"ctrip",
    title:null,
    tags:null,
    type:null,
    url:null
});

(function() {
    'use strict';
    waitForKeyElements (".product_main>.product_title>a", link_detail);//详情地址
    waitForKeyElements ("a[href*='/tours']", link_list);//列表地址
})();

function link_detail(jNode){
    var seed = JSON.parse(tpl);
    seed.url = fullUrl(jNode.attr("href"));
    seed.title = jNode.text().trim();
    var typeEl = jNode.parent().parent().parent().find(".product_pic>em");
    if(typeEl){seed.type = typeEl.text();}
    var tagEl = jNode.parent().parent().find(".product_icon_mod");
    if(tagEl){//标签
        seed.tags = tagEl.text().trim().replace(/\s+/g,",");
        if(seed.type){seed.tags= seed.type+","+seed.tags;}//把类型作为标签
        if(seed.url.indexOf("?")>0){
            seed.url  += "&tags="+seed.tags;
        }else{
            seed.url  += "?tags="+seed.tags;
        }
    }
    //*/
    commit("link_detail",seed);
}

function link_list(jNode){
    var seed = JSON.parse(tpl);
    seed.type = "list";
    seed.url = fullUrl(jNode.attr("href"));
    seed.title = "list-"+jNode.text().trim();
    commit("link_list",seed);
}

//预留
//转换为web链接地址：需要去除附加信息，确保唯一性
//原始: http://vacations.ctrip.com/tour/detail/p1019251060s28.html?isFull=F#ctm_ref=hod_sr_lst_dl_n_1_4
//转换后: http://vacations.ctrip.com/tour/detail/p1019251060s28.html
function web(link){
    var id = link.match(/p\d+s\d+.html/);//p1019251060s28.html
    return "http://vacations.ctrip.com/tour/detail/"+id;
}

//commit data
function commit(key,data){
    if(validate(data)){
        if(debug)console.log(key,data);
        commitUrl(data,next);
    }else{
        if(debug)console.log("validate failed.[prop]"+key,data);
    }
}

//校验：需要能够获取URL
function validate(data){
    return data.url;
}

//navigate to next url
function next(){
    if(!debug){_next()};
}



