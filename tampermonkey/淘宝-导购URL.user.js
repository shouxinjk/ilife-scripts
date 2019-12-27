// ==UserScript==
// @name         淘宝-导购URL
// @namespace    http://tampermonkey.net/
// @version      1.0
// @description  extract free tour lines
// @author       qchzhu
// @require http://code.jquery.com/jquery-latest.js
// @require http://118.190.75.121/dist/waitForKeyElements.js
// @require http://118.190.75.121/dist/md5.js
// @require http://118.190.75.121/dist/util.js?v=2.4
// @icon    http://www.shouxinjk.net/favicon.ico
// @match        https://pub.alimama.com/myunion.htm*
// @grant        none
// ==/UserScript==

//示例URL
//https://pub.alimama.com/myunion.htm?spm=a219t.11816994.1998910419.dd412374a1.27cb75a5Diw0yq#!/promo/self/links
//在完成登陆后，启动脚本开始自动批量生成导购链接
//1，获取10个待补充条目。条件：source=taobao && link.web2 is null
//2，逐个填写，并点击生成按钮，获取目标地址，更新到服务器
//3，完成后获取下一个内容，如果本地为空，则获取另外10个条目，直至结束

//this.$ = this.jQuery = jQuery.noConflict(true);//important: to remove jQuery conflict

var debug = true;
var items = [];
var item = {};

var remote = "/urltrans/urltrans.json";
var form = {
    siteid: "576750191",
    adzoneid: "109087800036",
    promotionURL: "https://pub.alimama.com/myunion.htm?spm=a219t.11816994.1998910419.dd412374a1.27cb75a5Diw0yq#!/promo/self/links",
    //t: "1561693894529",
    t:new Date().getTime(),
    pvid: "52_125.70.178.227_3506_1561692942632",
    _tb_token_: "54fb58071e918",
    _input_charset: "utf-8"
};

var sources=["taobao","fliggy"];//天猫淘宝飞猪都用相同的规则采集

var queryTemplate={
    collection : "my_stuff",
    limit:5,//默认每次取5条
    example : {
        source:"tmall",//首先采集天猫
        "link.web2":null//TODO：当前不能直接用null值，需要先将字段置空后更新
    }
};

(function() {
    'use strict';
    //需要对URL进行判断，仅在包含/promo/self/links时才开始
    if(window.location.href.indexOf("/promo/self/links")>0){
        if(debug)console.log("start generate promo link");
        setTimeout(loadItems,100);
    }else{
        if(debug)console.log("ignore. it is not promo link page",window.location.href);
    }
})();

function generateCode(){
    item = items.pop()[0];
    if(debug)console.log("processing item.",item,item.url);
    var data={
        _key:item._key,
        url:item.url,//required 作为整条记录唯一识别码
        link:{
            web2:null,
            wap2:null
        }
    };
    webLink(item,data);//处理web链接，并在回掉内处理wap链接
}

function webLink(item,data){
    form.promotionURL = item.link.web;
    if(debug)console.log("try generate cps link.",form);
    $.get(remote,form,function(result){
        console.log("got result.",result);
        if(result.ok){
            console.log("success generate cps link.",result);
            data.link.web2 = result.data.sclick;
            data.link.wap2 = result.data.sclick;//wap链接能够自动转换
            data.link.token = result.data.taoToken;
            commit(item._key,data);
        }else{
            if(result.data.resultCode == 9204){//不符合转换规范则直接将该链接设置为原始值提交
                console.log("Do not support CPS link. Using original links.",result);
                data.link.web2 = item.link.web;
                data.link.wap2 = item.link.wap;
                commit(item._key,data);
            }else{
                console.log("failed generate cps link.",result);
            }
        }
    },"json");
    //**/
}

function wapLink(item,data){
    if(debug)console.log("processing item.",item,item.url);
    form.url = item.link.wap;
    if(debug)console.log("processing form.",form);
    $.post(remote,form,function(result){
        if(result.indexOf("+")!=-1){
            data.link.wap2 = result.split("+")[0];
        }else{
            data.link.wap2=result;
        }
        commit(item._key,data);
    },"text");
}

//commit data
function commit(key,data){
    if(validate(data)){
        if(debug)console.log("validate succeed. [prop]"+key,data);
        commitData(data,next);
    }else{
        if(debug)console.log("validate failed.[prop]"+key,data);
    }
}

//validate url2 is there
function validate(data){
    return data.link.wap2 && data.link.web2; //两者都处理完成后才提交
}

//navigate to next url
function next(){
    //添加随机等待时间：1-10秒
    var seconds = 1000+Math.round(Math.random()*9000);
    console.log("process next item...waiting..."+(seconds/1000)+" seconds");
    setTimeout(next2,seconds);
}

function next2(){
    if(items.length>0){
        generateCode();
    }else{
        loadItems();
    }
}

function loadItems(){
    if(debug)console.log("load pending items.");
    queryData(queryTemplate,function(result){
        if(debug)console.log("got result.",result);
        if(result.count>0){
            items.push(result.result);
            generateCode();//start generate code
        }else{
            if(debug)console.log("no more items",queryTemplate.example.source);
            if(sources.length>0){
                queryTemplate.example.source = sources.pop();
                if(debug)console.log("start query items",queryTemplate.example.source);
                loadItems();
            }
        }
    })
}


