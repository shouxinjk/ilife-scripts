// ==UserScript==
// @name         list-当当-高佣商品
// @namespace    http://tampermonkey.net/
// @version      1.0
// @description  extract list
// @author       qchzhu
// @require http://code.jquery.com/jquery-latest.js
// @require http://118.190.75.121/dist/waitForKeyElements.js
// @require http://118.190.75.121/dist/md5.js
// @require http://118.190.75.121/dist/util.js?v=2.5
// @icon    http://www.shouxinjk.net/favicon.ico
// @match        http://union.dangdang.com/ads/newhighproductads*
// @grant        none
// ==/UserScript==

//示例URL
//http://union.dangdang.com/ads/newhighproductads?order_by=future_total_percent&order=desc&page=1443

this.$ = this.jQuery = jQuery.noConflict(true);//important: to remove jQuery conflict

var debug = true;

var schema={
//TODO: validate and commit
};

var seed={};
var tags = [];
var index = 0;

var data = {};

var seedTpl = JSON.stringify(
    {//an example for extract urls
        task:{
            user:"userid",//注册的编码
            executor:"machine"//机器标识
        },
        source:"dangdang",
        type:"item",
        rate:{
            percentage:0,
            coupon:0,
            amount:0
        },
        taskUrl:document.location.href,
        status:"new",
        url:null // by default the url is null
    }
);

var dataTpl = JSON.stringify(
    {
        url:null,
        source:"dangdang",
        title:null,
        logo:null,
        summary:"",
        tags:[],
        price:{
            bid:null,
            coupon:null,
            sale:null
        },
        profit:{
            type:"2-party",
            rate:null,
            amount:null,
        },
        link:{
            web:null,//web浏览地址
            wap:null//移动端浏览地址，默认与web一致
        }
    }
);

(function() {
    'use strict';
    waitForKeyElements (".highproducttable tr", item);//采集具体商品页面
    //waitForKeyElements (".el-pager .number", list);//采集列表页面，一般是分页
    sroll_page();
})();

function sroll_page(){
    var h = $(document).height()-$(window).height();
    $(document).scrollTop(h);
}

function item(jNode){//采集具体内容条目

    //首行为标题，直接跳过
    if(jNode.attr("id")=="gray"){
        console.log("skip title line ... ");
        return;
    }

    //空白间隔行，直接跳过
    if(jNode.html().trim().length==0){
        console.log("skip blank line ... ");
        return;
    }

    //注意：由于有多个seed，需要重新赋值
    seed=JSON.parse(seedTpl);
    data = JSON.parse(dataTpl);

    //获取链接地址
    var td = jNode.find("td:first");
    //console.log("href td",td,td.html());
    var link = td.find("a").attr("href");
    //console.log("link td",link);
    data.url = web(link);
    data.link.web = web(link);
    data.link.wap = wap(link);

    //获取logo图片地址
    //var logoImg = jNode.find("a.content-title[href*='id=']").find("img").attr("src");
    //data.logo = fullUrl(logoImg);

    //添加识别参数。仅作为占位符，便于后续添加其他参数用于采集
    link += "?try=true";

    var price = 0;//促销价：第4列
    var priceTD = td.next().next().next().next();
    console.log("price td",priceTD,priceTD.html());
    price = Number(priceTD.text());
    console.log("price",price);
    //获取佣金比例:低
    var rateTD = priceTD.next().next();
    console.log("rate td",rateTD,rateTD.html());
    var num = rateTD.text().match(/\d+\.*\d*/g);
    data.profit.rate = num&num[0]?Number(num[0]):null;
    console.log("rate",data.profit.rate);
    seed.rate.percentage = data.profit.rate;
    link += "&rate_percentage="+data.profit.rate;
    //获取佣金
    data.profit.amount = price*data.profit.rate/100;
    seed.rate.amount = data.profit.amount;
    console.log("amount",data.profit.amount);
    link += "&rate_amount="+data.profit.amount;

    //commitBlankData("data item");

    seed.url = fullUrl(link);
    commitSeed("seed item ");
}

function list(jNode){//采集列表页
    seed=JSON.parse(seedTpl);
    seed.type="list";
    //获取分页/分类地址
    var pageNumber = Number(jNode.text());
    if(pageNumber && pageNumber>0){
        var link = window.location.href.replace(/pageNo=\d+/,"pageNo="+jNode.text().trim());
        seed.url = fullUrl(link);
        commit("seed list "+ index);
    }
}

function url(link){
    return link;
}

//commit seed
function commitSeed(key){
    if(validateSeed()){
        if(debug)console.log("validate succeed. try to commit "+key,seed);
        commitUrl(seed);
        index++;
    }else{
        if(debug)console.log("validate failed.[prop]"+key,seed);
    }
}

//validate seed collected
function validateSeed(){
    //TODO use json schema to validate data
    return seed.url && seed.url.indexOf("product.dangdang.com")>0;
}

/////////////////////新建空白item，包含价格等
//根据浏览器地址处理得到访问地址，除掉spm等临时信息，避免造成重复提交
function web(link){
    var id = link.match(/\d+.html/)[0];//匹配后返回：24202661.html
    return "http://product.dangdang.com/"+id;
}

//转换为移动链接地址
//web: http://product.dangdang.com/24202661.html?ref=book-686989-3032_2-2847532-0
//wap: http://product.m.dangdang.com/product.php?pid=24202661
function wap(link){
    var str = link.match(/\d+.html/)[0];//匹配后返回：24202661.html
    var id = str.match(/\d+/)[0];//匹配后返回：24202661
    return "http://product.m.dangdang.com/product.php?pid="+id;
}

//commit data
function commitBlankData(key){
    if(validateData()){
        if(debug)console.log("validate succeed. try to commit data.",data);
        commitData(data);
    }else{
        if(debug)console.log("validate failed.[prop]"+key,data);
    }
}

//validate data collected
function validateData(){
    //TODO use json schema to validate data
    return data.url && data.url.indexOf("product.dangdang.com")>0 && data.profit.amount;
}

/////////////////////

//navigate to next url
function next(){
    if(!debug){_next();}
}




