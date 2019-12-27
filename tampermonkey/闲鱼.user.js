// ==UserScript==
// @name         闲鱼
// @namespace    http://tampermonkey.net/
// @version      1.0
// @description  extract items
// @author       qchzhu
// @require http://code.jquery.com/jquery-latest.js
// @require http://118.190.75.121/dist/waitForKeyElements.js
// @require http://118.190.75.121/dist/md5.js
// @require http://118.190.75.121/dist/util.js?v=2.5
// @icon    http://www.shouxinjk.net/favicon.ico
// @match        https://2.taobao.com/item.htm*
// @grant        none
// ==/UserScript==

//示例URL
//https://2.taobao.com/item.htm?spm=2007.1000261.0.0.135334f1KPlTYs&id=585975377123

this.$ = this.jQuery = jQuery.noConflict(true);//important: to remove jQuery conflict

var debug = false;

var schema={
//TODO: validate and commit
};

var data={
    task:{
        user:"userid",//注册的编码
        executor:"machine",//机器标识
            timestamp:new Date().getTime(),//时间戳
            url:window.location.href//原始浏览地址
    },
    url:web(window.location.href),
    type:"all",
    category:[],
    source:"xianyu",
    title:null,
    summary:"",
    price:{
        bid:null,
        sale:null
    },
    images:[],
    tags:["二手置换"],
    distributor:{//平台，如当当，淘宝，携程
        name:"闲鱼"
    },
    producer:{//厂商，指商品或服务提供者。服务提供商，书籍出版商，旅行社
        name:""
    },
    seller:{//卖家，即商店，京东自营，当当自营，***旗舰店
        name:""
    },
    rank:{
        score:null,
        base:null,
        count:null,
        match:0.75//by default
    },
    link:{
        web:web(window.location.href),//web浏览地址
        wap:wap(window.location.href)//移动端浏览地址，默认与web一致
    },
    props:[]//key,value键值对
};
var keys=[];
var seed={//an example for extract urls
    task:{
        user:"userid",//注册的编码
        executor:"machine"//机器标识
    },
    source:"xianyu",
    type:"all",
    taskUrl:document.location.href,
    url:web(document.location.href)
};

//var timerId = setInterval(clickCommentsTab, 500);
var timerMaxCount = 20;

(function() {
    'use strict';
    waitForKeyElements ("h1.title", title);
    waitForKeyElements (".describe[data-spm-anchor-id*='.']", summary);
    waitForKeyElements (".m-crumb span", tags);//分类作为标签
    waitForKeyElements (".wangwang", seller);
    waitForKeyElements (".thumbs img", images_slide);
    //waitForKeyElements (".thumbs img", images);
    waitForKeyElements ("input[name='current_price']",price_sale);
    waitForKeyElements (".para:contains('原　　价：')",price_bid);
    waitForKeyElements (".para",props);
    //waitForKeyElements (".j-commentEntry",rank_score);
    //waitForKeyElements (".num",rank_count);//评价数
    //commitUrl(seed);//here is an example
})();

//等待详情图片加载完成并点击“全部评论”tab
//冗余：由于采用懒加载，避免超时，设置10秒等候时间单独加载
function clickCommentsTab(){
    if($("#description p img[src*=imgextra]") && $("#description p img[src*=imgextra]").length>0){//确认采集图片并执行点击事件
        $("#description p img[src*=imgextra]").each(function(){
            checkImage($(this));//采集图片
        });
        if(debug){console.log("\n\n\ncomplete, now change tab\n\n\n");}
        var eClick = jQuery.Event( "click" );
        $(".J_ReviewsCount:parent").trigger( eClick );
        clearInterval(timerId);//清除定时器

    }else{
        if(timerMaxCount--<0){
            clearInterval(timerId);
        }
    }
}

function title(jNode){
    data.title = jNode.text().trim();
    commit("title");
}

function summary(jNode){
    var txt = jNode.text().replace(/\s+/g," ");
    if(txt.length>0){
        data.summary += txt+"<br/>";
        commit("summary");
    }
}

function tags(jNode){
    var tag = jNode.text().trim();
    if(tag.length>1 &&tag.length<10 && data.tags.indexOf(tag)<0 && ",首页,".indexOf(tag)<0){
        data.tags.push(tag);
    }
    commit("tags");
}

function seller(jNode){
    data.seller.name = jNode.text().replace(/\s+/," ").trim();
    commit("seller");
}

function category(jNode){
    data.category.push("all");
    commit("category");
}

function props(jNode){
    if(jNode.parent().find("em")){
        var key = jNode.text().replace(/\s+/g,"");
        var value = jNode.parent().find("em").text().trim();
        var prop = {
            key:key,
            value:value
        };
        if(keys.indexOf(key)<0 && value.trim().length>0){
            data.props.push(prop);
            keys.push(key);
        }
        //部分属性作为标签
        if(data.tags.indexOf(value)<0 &&",成色".indexOf(key)>0 &&value.length>1 &&value.length<10){
            data.tags.push(value);
        }
        commit("props");
    }
}

function images(jNode){
    var img = fullUrl(jNode.attr("data-original"));
    checkImage(img);
}

function images_slide(jNode){
    var img = fullUrl(jNode.attr("src")).replace(/80x60/,"728x728");
    checkImage(img);
}

//判定尺寸后提交，需要大于400*300
function checkImage(img_url){
    var img = new Image();
    img.src = img_url;
    if(img.complete){// 如果有缓存则直接获取
        if(debug)console.log('img.complete.width:'+img.width+',height:'+img.height);
        if(img.width>=400 && img.height>=300 && data.images.indexOf(img_url)<0){
            data.images.push(img_url);
            commit("images");
        }
    }else{// 否则待加载完成执行
        img.onload = function(){
            if(debug)console.log('img.onload.width:'+img.width+',height:'+img.height);
            if(img.width>=400 && img.height>=300 && data.images.indexOf(img_url)<0){
                data.images.push(img_url);
                commit("images");
            }
        }
    }
}

function rank_score(jNode){
    var num = jNode.text().match(/\d+\.*\d*/);
    data.rank.score = num?Number(Number(num[0])/20).toFixed(1):null;
    data.rank.base = 5;
    commit("rank_score");
}

function rank_count(jNode){
    var num = jNode.text().match(/\d+/g);// 全部（1）
    data.rank.count = num?Number(num[0]):null;
    commit("rank_count");
}

function price_sale(jNode){
    var num = jNode.val();
    data.price.sale = num?Number(num):null;
    commit("price_sale");
}

function price_bid(jNode){
    var num = jNode.parent().text().match(/\d+\.*\d*/);
    data.price.bid = num?Number(num[0]):null;
    commit("price_bid");
}

//根据浏览器地址处理得到访问地址，除掉spm等临时信息，避免造成重复提交
//https://2.taobao.com/item.htm?spm=2007.1000261.0.0.135334f1KPlTYs&id=585975377123
function web(link){
    var id = link.match(/id=\d+/)[0];//匹配后返回：id=585975377123
    return "https://2.taobao.com/item.htm?PRODUCTID".replace(/PRODUCTID/,id);
}

//转换为移动链接地址
//https://2.taobao.com/item.htm?spm=2007.1000261.0.0.135334f1KPlTYs&id=585975377123
function wap(link){
    var id = link.match(/id=\d+/)[0];//匹配后返回：id=585975377123
    return "https://2.taobao.com/item.htm?PRODUCTID".replace(/PRODUCTID/,id);
}

//commit data
function commit(key){
    if(validate()){
        if(debug)console.log("validate succeed. [prop]"+key,data);
        commitData(data,next);
    }else{
        if(debug)console.log("validate failed.[prop]"+key,data);
    }
}

//validate data collected
function validate(){
    //TODO use json schema to validate data
    return data.title && data.images.length>0 && data.price.sale;
}

//navigate to next url
function next(){
    if(!debug){_next();}
}



