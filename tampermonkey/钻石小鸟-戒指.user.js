// ==UserScript==
// @name         钻石小鸟-戒指
// @namespace    http://tampermonkey.net/
// @version      1.0
// @description  extract items
// @author       qchzhu
// @require http://code.jquery.com/jquery-latest.js
// @require http://118.190.75.121/dist/waitForKeyElements.js
// @require http://118.190.75.121/dist/md5.js
// @require http://118.190.75.121/dist/util.js?v=2.5
// @icon    http://www.shouxinjk.net/favicon.ico
// @match        http://www.zbird.com/weddings/*
// @match        http://www.zbird.com/zuanshi-duijie/*
// @match        http://www.zbird.com/accessory/*
// @match        http://www.zbird.com/dingzhi-jiezhi/*
// @grant        none
// ==/UserScript==

//示例URL
//http://www.zbird.com/weddings/rds67-2445516.html
//http://www.zbird.com/zuanshi-duijie/pz05-u.html
//http://www.zbird.com/accessory/ngn38-5160500.html
//http://www.zbird.com/dingzhi-jiezhi/rdt30-f-1-0-1.html

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
    source:"zbird",
    title:null,
    summary:"",
    price:{
        bid:null,
        sale:null
    },
    images:[],
    tags:[],
    distributor:{//平台，如当当，淘宝，携程
        name:"钻石小鸟"
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
    source:"zbird",
    type:"all",
    taskUrl:document.location.href,
    url:web(document.location.href)
};

//var timerId = setInterval(clickCommentsTab, 500);
var timerMaxCount = 40;
var thumbs = [];//记录懒加载图片数量

(function() {
    'use strict';
    waitForKeyElements ("meta[name='keywords']", title);
    //waitForKeyElements (".copy__bodycopy", summary);
    waitForKeyElements (".navTit_a",category);
    waitForKeyElements (".list_small_pic img", images_slide);
    waitForKeyElements (".loadImgWithTransEffect img", images);
    waitForKeyElements ("#Table_01 img", images);
    waitForKeyElements (".f_cont_detl_pic img", images);
    //waitForKeyElements (".good-tag", tags);//筹款状态作为标签
    //waitForKeyElements (".service-item-text:contains('发货并提供售后')", seller);
    waitForKeyElements (".u_psys_pri b",price_sale);
    waitForKeyElements (".u_psys_linepri b",price_bid);
    waitForKeyElements (".f_psys_inf",props);
    //waitForKeyElements (".comment-top-positive-rate",rank_score);
    //waitForKeyElements (".comment-top-tabs-item:contains('全部')",rank_count);//评价数
    //waitForKeyElements (".comment-top-tabs-item", tags_comment);//评价标签
    //commitUrl(seed);//here is an example
})();

//等待详情图片加载完成并点击“全部评论”tab
//冗余：由于采用懒加载，避免超时，设置10秒等候时间单独加载
function clickCommentsTab(){
    var imgSelector = ".js-product-gallery-overlay";
    if(thumbs.length>0){//缩略图是否已经采集完
        var jNode = thumbs.pop();
        if(debug){console.log("\n\nclick thumb image...");}
        var eClick = jQuery.Event( "click" );
        jNode.trigger( eClick );
        //采集大图 url
        var img = fullUrl($(imgSelector).attr("data-src"));
        if(debug)console.log("\n\nimages slide: "+img);
        checkImage(img);
        if(thumbs.length==0){//如果已经处理完则结束。注意：避免一开始就退出，需要放到处理操作之后
            clearInterval(timerId);
        }
    }
    if(timerMaxCount--<0){//如果到达等待时长，则自动结束
        clearInterval(timerId);
    }
}

function title(jNode){
    data.title = jNode.attr("content").trim();
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

function tags_comment(jNode){
    var tag = jNode.text().replace(/\(\d+\)/g,"").trim();
    if(tag.length>1 &&tag.length<10 && data.tags.indexOf(tag)<0 && ",全部,有图,".indexOf(tag)<0){
        data.tags.push(tag);
    }
    commit("tags");
}

function seller(jNode){
    data.seller.name = jNode.text().replace(/^由/,"").replace(/发货并提供售后/,"").trim();
    commit("seller");
}

function category(jNode){
    var txt = jNode.text().trim();
    if(txt.length>0 && data.category.indexOf(txt)<0 && ",首页".indexOf(txt)<0){
        data.category.push(txt);
    }
    if(txt.length>0 && data.tags.indexOf(txt)<0 && ",首页".indexOf(txt)<0){
        data.tags.push(txt);
    }
    commit("category");
}

function props(jNode){
    if(jNode.find("span") && jNode.find("b")){
        var key = jNode.find("span").text().trim();
        var value = jNode.find("b").text().trim();
        var prop = {
            //key:key,
            //value:value
        };
        prop[key]=value;
        if(keys.indexOf(key)<0 && value.trim().length>0){
            data.props.push(prop);
            keys.push(key);
        }
        //部分属性作为标签
        if(data.tags.indexOf(value)<0 &&",材质".indexOf(key)>0 &&value.length>1 &&value.length<10){
            data.tags.push(value);
        }
        commit("props");
    }
}

function images(jNode){
    var img = fullUrl(jNode.attr("src"));
    checkImage(img);
}

function images_slide(jNode){
    var img = fullUrl(jNode.attr("src")).replace(/small/,"big");
    checkImage(img);
}

//判定尺寸后提交，需要大于400*300
function checkImage(img_url,scroll=false){
    var minWidth = 300;
    var minHeight = 180;
    var img = new Image();
    img.src = img_url;
    if(img.complete){// 如果有缓存则直接获取
        //if(debug)console.log('img.complete.width:'+img.width+',height:'+img.height);
        if(img.width>=minWidth && img.height>=minHeight && data.images.indexOf(img_url)<0){
            data.images.push(img_url);
            commit("images");
        }
    }else{// 否则待加载完成执行
        img.onload = function(){
            //if(debug)console.log('img.onload.width:'+img.width+',height:'+img.height);
            if(img.width>=minWidth && img.height>=minHeight && data.images.indexOf(img_url)<0){
                data.images.push(img_url);
                commit("images");
            }
        }
    }
    if(scroll){//向下滚动页面
        window.scrollTo(0, document.body.scrollTop+document.documentElement.scrollTop+50);//注意：由于图片懒加载，可能导致跳过未加载完成图片，故采用模拟滚动
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
    var num = jNode.text().match(/[\d\,\.]+/g);
    data.price.sale = num?Number(num[0].replace(/,/g,"")):null;
    commit("price_sale");
}

function price_bid(jNode){
    var num = jNode.text().match(/[\d\,\.]+/g);
    data.price.bid = num?Number(num[0].replace(/,/g,"")):null;
    commit("price_bid");
}

//根据浏览器地址处理得到访问地址
//http://www.zbird.com/weddings/rds67-2445516.html
function web(link){
    return window.location.href;
}

//转换为移动链接地址
//https://m.zbird.com/weddings/rds67-2445516.html
function wap(link){
    return window.location.href.replace("http://www","https://m");
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



