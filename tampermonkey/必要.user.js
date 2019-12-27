// ==UserScript==
// @name         必要
// @namespace    http://tampermonkey.net/
// @version      1.0
// @description  extract items
// @author       qchzhu
// @require http://code.jquery.com/jquery-latest.js
// @require http://118.190.75.121/dist/waitForKeyElements.js
// @require http://118.190.75.121/dist/md5.js
// @require http://118.190.75.121/dist/util.js?v=2.5
// @icon    http://www.shouxinjk.net/favicon.ico
// @match        http://www.biyao.com/products/*
// @grant        none
// ==/UserScript==

//示例URL
//http://www.biyao.com/products/1300515009080000001-0.html

this.$ = this.jQuery = jQuery.noConflict(true);//important: to remove jQuery conflict

var debug = false;//isProduction("biyao");

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
    source:"biyao",
    title:null,
    summary:"",
    price:{
        bid:null,
        sale:null
    },
    images:[],
    tags:["工厂直供"],
    distributor:{
        name:"必要商城"
    },
    producer:{
        name:""
    },
    seller:{
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
    source:"biyao",
    type:"all",
    taskUrl:document.location.href,
    url:web(document.location.href)
};


var startTime = new Date().getTime();//用时间戳控制页面切换时间，开始时间
var commitTime = new Date().getTime()+5*1000;//记录最近一次提交数据时间，每次commit将修改改时间
var durationTime = Math.floor(Math.random()*10+5)*1000;//控制间隔毫秒数 5-15秒
var idleTime = 1000;//提交后等待1秒

var timerId = setInterval(clickCommentsTab, 500);
var timerMaxCount = 20;
var lazyImages = [];//记录懒加载图片数量

(function() {
    'use strict';
    waitForKeyElements (".panel-top h1", title);
    waitForKeyElements (".panel-top p", summary);
    waitForKeyElements (".editor-picture img", images_slide);
    //waitForKeyElements (".manufacturer", producer);
    waitForKeyElements (".editor-policy span", tags);
    waitForKeyElements (".manufacturer", seller);
    waitForKeyElements (".imgText-edit img", images);
    waitForKeyElements (".panel-maney",price_sale);
    //waitForKeyElements (".market-price",price_bid);
    waitForKeyElements (".txq_item dl",props);
    waitForKeyElements ("#evalScore:parent",rank_score);
    waitForKeyElements ("#evaluate:contains(' ')",rank_count);//评价数
    //waitForKeyElements (".comment-top-tabs-item", tags_comment);//评价标签
    //commitUrl(seed);//here is an example
})();

//等待详情图片加载完成并点击“全部评论”tab
//冗余：由于采用懒加载，避免超时，设置10秒等候时间单独加载
function clickCommentsTab(){
    var imgSelector = ".imgText-edit img";
    var commentBtnSelector = "#evaluate";
    if($(imgSelector) && $(imgSelector).length>0){//确认采集图片并执行点击事件
        $(imgSelector).each(function(){
            var imgUrl = $(this).attr("src");
            if(lazyImages.indexOf(imgUrl)<0){
                lazyImages.push(imgUrl);
            }
            checkImage(imgUrl);//采集图片
            //滚动到页面底部加载其他图片
            window.scrollTo(0, document.body.scrollTop+document.documentElement.scrollTop+50);//注意：由于图片懒加载，可能导致跳过未加载完成图片，故采用模拟滚动
        });
        if(lazyImages.length >= $(imgSelector).length){//表示正文图片加载完成
            if(debug){console.log("\n\n\ncomplete, now change tab\n\n\n");}
            var eClick = jQuery.Event( "click" );
            $(commentBtnSelector).trigger( eClick );
            clearInterval(timerId);//清除定时器
            setInterval(next, 500);//需要设置页面跳转检查
        }
    }
    if(timerMaxCount--<0){//如果到达等待时长，则自动结束
        clearInterval(timerId);
        setInterval(next, 500);//需要设置页面跳转检查
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

function tags_comment(jNode){
    var tag = jNode.text().replace(/\(\d+\)/g,"").trim();
    if(tag.length>1 &&tag.length<10 && data.tags.indexOf(tag)<0 && ",全部,有图,".indexOf(tag)<0){
        data.tags.push(tag);
    }
    commit("tags");
}

function seller(jNode){
    data.seller.name = jNode.text().trim();
    commit("seller");
}

function producer(jNode){
    data.producer.name = jNode.text().trim();
    commit("producer");
}

function category(jNode){
    data.category.push("all");
    commit("category");
}

function props(jNode){
    if(jNode.find("dt") && jNode.find("dd")){
        var key = jNode.find("dt").text().replace(/:/g,"").replace(/：/g,"").replace(/\s+/g,"").trim();
        var value = jNode.find("dd").text().trim();
        var prop = {
            //key:key,
            //value:value
        };
        prop[key]=value;
        if(keys.indexOf(key)<0){
            data.props.push(prop);
            keys.push(key);
        }
        commit("props");
    }
}

function images(jNode){
    var img = fullUrl(jNode.attr("src"));
    checkImage(img);
}

function images_slide(jNode){
    var img = fullUrl(jNode.attr("src"));
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
    data.rank.score = num?Number(num[0]):null;
    data.rank.base = 5;
    commit("rank_score");
}

function rank_count(jNode){
    var num = jNode.text().match(/\d+/g);
    data.rank.count = num?Number(num[0]):null;
    commit("rank_count");
}

function price_sale(jNode){
    var num = jNode.text().match(/\d+\.*\d*/g);
    data.price.sale = num?Number(num[0]):null;
    commit("price_sale");
}

function price_bid(jNode){
    var num = jNode.text().match(/\d+\.*\d*/);
    data.price.bid = num?Number(num[0]):null;
    commit("price_bid");
}

//根据浏览器地址处理得到访问地址，除掉spm等临时信息，避免造成重复提交
//http://www.biyao.com/products/1300515009080000001-0.html
function web(link){
    var id = link.match(/\d+/g);
    return "http://www.biyao.com/products/PRODUCTID-SUFFIX.html".replace(/PRODUCTID/,id[0]).replace(/SUFFIX/,id[1]);
}

//转换为移动链接地址
//http://m.biyao.com/products/1300515009080000001.html?source=pc-biyaonew
function wap(link){
    var id = link.match(/\d+/g);
    return "http://m.biyao.com/products/PRODUCTID.html".replace(/PRODUCTID/,id[0]);
}

//commit data
function commit(key){
    commitTime = new Date().getTime();
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
    var duration = new Date().getTime()-startTime;
    var idle = new Date().getTime()-commitTime;
    var isPageTimeout = duration > durationTime && idle > idleTime;
    console.log("\n\n crawling ...",duration,durationTime,idle,idleTime,isPageTimeout);
    if( !debug && isPageTimeout ){_next();}
}



