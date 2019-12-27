// ==UserScript==
// @name         list-淘宝-高佣商品
// @namespace    http://tampermonkey.net/
// @version      1.0
// @description  extract list
// @author       qchzhu
// @require http://code.jquery.com/jquery-latest.js
// @require http://118.190.75.121/dist/waitForKeyElements.js
// @require http://118.190.75.121/dist/md5.js
// @require http://118.190.75.121/dist/util.js?v=2.5
// @icon    http://www.shouxinjk.net/favicon.ico
// @match        https://pub.alimama.com/promo/search/index.htm*
// @grant        none
// ==/UserScript==

//示例URL
//https://pub.alimama.com/promo/search/index.htm?_t=1555385661305

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
        source:"taobao",
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
        source:"taobao",
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
    waitForKeyElements (".common-product-box", item);//采集具体商品页面
    //waitForKeyElements (".yx-cp-tabNav-item>a[href*='item/list']", list);//采集列表页面，一般是分页
    sroll_page();
})();

function sroll_page(){
    var h = $(document).height()-$(window).height();
    $(document).scrollTop(h);
}

function item(jNode){//采集具体内容条目
    //注意：由于有多个seed，需要重新赋值
    seed=JSON.parse(seedTpl);
    data = JSON.parse(dataTpl);

    tags = [];
    //导航作为tag
    jNode.find(".m-crumbs span").each(function( index ) {
        var txt = $( this ).text().trim();
        if(debug){console.log("curmbs link.",index,txt);}
        if(txt.length>0 && tags.indexOf(txt)<0 && ",首页,".indexOf(txt)<0){
            tags.push(txt);
        }
    });
    data.tags = tags;

    //获取链接地址
    var link = jNode.find("a.content-title[href*='id=']").attr("href");
    data.url = web(link);
    data.link.web = web(link);
    data.link.wap = wap(link);

    //获取logo图片地址
    //var logoImg = jNode.find("a.content-title[href*='id=']").find("img").attr("src");
    //data.logo = fullUrl(logoImg);

    //区分是淘宝店、天猫店
    var source = "taobao";
    if(jNode.find("span[title='天猫店铺']")){
        source = "tmall";
        data.source = "tmall";
    }

    //获取佣金比例
    var num = jNode.find(".price-info-text:contains('营销')").parent().find(".price-info-num").text().replace(/\s+/g,"").match(/\d+\.*\d*/g);//金额
    if(num != null && num[0]!=null && num[0].trim().length>0){
        data.profit.rate = num&num[0]?Number(num[0]):null;
        link += "&rate_percentage="+data.profit.rate;
    }

    //获取佣金
    num = jNode.find(".price-info-text:contains('佣金')").parent().find(".price-info-num").text().replace(/\s+/g,"").match(/\d+\.*\d*/g);//金额
    if(num != null && num[0]!=null && num[0].trim().length>0){
        data.profit.amount = num&num[0]?Number(num[0]):null;
        link += "&rate_amount="+data.profit.amount;
    }

    //获取优惠券
    num = jNode.find(".tag-coupon .money").text().replace(/\s+/g,"").match(/\d+\.*\d*/g);//金额
    console.log("coupon",num);
    if(num != null && num[0]!=null && num[0].trim().length>0){
        data.price.coupon = num&num[0]?Number(num[0]):null;
        link += "&rate_coupon="+data.price.coupon;
    }

    //commitBlankData("data item");

    seed.url = fullUrl(link);
    commitSeed("seed item ");
}

function list(jNode){//采集列表页
    seed=JSON.parse(seedTpl);
    seed.type="list";
    //获取分页/分类地址
    var link = jNode.attr("href");
    seed.url = fullUrl(link);
    commit("seed list "+ index);
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
    return seed.url && seed.url.indexOf("item.htm")>0;
}

/////////////////////新建空白item，包含价格等
//根据浏览器地址处理得到访问地址，除掉spm等临时信息，避免造成重复提交
//https://item.taobao.com/item.htm?id=568150899908
function web(link){
    var id = link.match(/id=\d+/)[0];//匹配后返回：id=570595315246
    return data.source=="tmall"?("https://detail.tmall.com/item.htm?"+id):("https://item.taobao.com/item.htm?"+id);
}

//转换为移动链接地址
//web: https://item.taobao.com/item.htm?id=568150899908
//wap: https://h5.m.taobao.com/awp/core/detail.htm?id=570595315246
function wap(link){
    var id = link.match(/id=\d+/)[0];//匹配后返回：id=570595315246
    return data.source=="tmall"?("https://detail.m.tmall.com/item.htm?"+id):("https://h5.m.taobao.com/awp/core/detail.htm?"+id);
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
    return data.url && data.url.indexOf("item.htm")>0  && data.profit.amount;
}

/////////////////////

//navigate to next url
function next(){
    if(!debug){_next();}
}




