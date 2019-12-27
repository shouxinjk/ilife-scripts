// ==UserScript==
// @name         川航积分商城
// @namespace    http://tampermonkey.net/
// @version      1.0
// @description  extract items
// @author       qchzhu

// @require http://118.190.75.121/dist/waitForKeyElements.js
// @require http://118.190.75.121/dist/md5.js
// @require http://118.190.75.121/dist/util.js?v=2.4
// @icon    http://www.shouxinjk.net/favicon.ico
// @match        https://ffp.sichuanair.com/FFPNewWeb/Mall/Detail/*
// @grant        none
// ==/UserScript==

//示例URL
//http://ffp.sichuanair.com/FFPNewWeb/Mall/Detail/12228
//this.$ = this.jQuery = jQuery.noConflict(true);//important: to remove jQuery conflict

var debug = false;//isProduction("sichuanair");

var schema={
//TODO: validate and commit
};

var prop_keys = [];//临时，用于记录prop的key，避免重复

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
    source:"sichuanair",
    title:null,
    summary:"",
    price:{
        currency:"积分",
        bid:null,
        sale:null
    },
    images:[],
    tags:["积分兑换"],
    distributor:{
        name:"川航积分商城"
    },
    producer:{
        name:""
    },
    seller:{
        name:"四川航空积分商城"
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

var seed={//an example for extract urls
    task:{
        user:"userid",//注册的编码
        executor:"machine"//机器标识
    },
    source:"cmcc",
    type:"all",
    taskUrl:document.location.href,
    url:web(document.location.href)
};

var startTime = new Date().getTime();//用时间戳控制页面切换时间，开始时间
var commitTime = new Date().getTime()+5*1000;//记录最近一次提交数据时间，每次commit将修改改时间
var durationTime = Math.floor(Math.random()*10+5)*1000;//控制间隔毫秒数 5-15秒
var idleTime = 1000;//提交后等待1秒

var timerId = setInterval(next, 500);//需要设置页面跳转检查

(function() {
    'use strict';
    waitForKeyElements (".ProductDetail_Right h2", title);
    waitForKeyElements (".productdet_title a", category);
    waitForKeyElements (".ProductDetail_Left img", images_slide);
    //waitForKeyElements (".ps_r_title_content_l img", images);
    waitForKeyElements (".News_Detail_Content", summary);
    //waitForKeyElements ("a[href*=storeId]", seller);
    //waitForKeyElements (".p-parameter-list li",props);
    waitForKeyElements (".PriceMile",price_sale);
    //waitForKeyElements (".J-mPrice",price_bid);
    waitForKeyElements ("meta[name=keywords]", tags);
    //waitForKeyElements (".praiseNum",rank_score);
    //waitForKeyElements (".praisePeople",rank_count);//评价数
    //sroll_page();
    //commitUrl(seed);//here is an example
})();

function sroll_page(){
    var h = $(document).height()-$(window).height();
    $(document).scrollTop(h);
}

function title(jNode){
    data.title = jNode.text().trim();
    commit("title");
}

function summary(jNode){
    var txt = jNode.text().replace(/\s+/g,"");
    if(txt.length>0){
        data.summary += txt+"<br/>";
        commit("summary");
    }
    //解析属性列表
    props(jNode);
}

function summary_subtitle(jNode){
    var txt = jNode.text().replace(/\s+/g,"");
    if(txt.length>0){
        data.summary += txt+"<br/>";
        commit("summary");
    }
}

function good_shop(jNode){
    var tag = jNode.text().trim();
    if(tag.length>0 && data.tags.indexOf(tag)<0){
        data.tags.push(tag);
    }
    commit("good_shop");
}

function tags(jNode){
    var txt = jNode.attr('content').replace(/\s+/g,";");
    var tag = txt.split(",");
    for(var i=0;i<tag.length;i++){
        var t = tag[i];
        if(t.length>1 && data.tags.indexOf(t)<0){
            data.tags.push(t);
        }
    }
    commit("tags");
}

function seller(jNode){
    data.seller.name = jNode.text().trim();
    commit("seller");
}

function category(jNode){
    var cat = jNode.text().trim();
    if(data.category.indexOf(cat)<0 && ",首页".indexOf(cat)<0){
        data.category.push(cat);
        commit("category");
        data.tags.push(cat);//同时作为标签
    }
}

function props(jNode){
    var txt = jNode.text().replace(/\s+/g,"").split("：");
    if(txt.length>1 && txt[1].trim().length>0){
        var key = txt[0].trim();
        var value = txt[1].replace(/；/g,"").trim();
        if(key.length>0&&prop_keys.indexOf(key)<0){
            prop_keys.push(key);
            var prop = {};
            prop[key]=value;
            data.props.push(prop);
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

//判定尺寸后提交，需要大于300*300
function checkImage(img_url){
    var img = new Image();
    img.src = img_url;
    if(img.complete){// 如果有缓存则直接获取
        if(debug)console.log('img.complete.width:'+img.width+',height:'+img.height);
        if(img.width>=300 && img.height>=300 && data.images.indexOf(img_url)<0){
            data.images.push(img_url);
            commit("images");
        }
    }else{// 否则待加载完成执行
        img.onload = function(){
            if(debug)console.log('img.onload.width:'+img.width+',height:'+img.height);
            if(img.width>=300 && img.height>=300 && data.images.indexOf(img_url)<0){
                data.images.push(img_url);
                commit("images");
            }
        }
    }
}

function rank_score(jNode){
    var num = jNode.text().match(/\d+/g);
    data.rank.score = num?Number(Number(num[0])/20).toFixed(1):null;
    data.rank.base = "5";
    commit("rank_score");
}

function rank_count(jNode){
    var num = jNode.text().match(/\d+/g);
    data.rank.count = num?Number(num):null;
    commit("rank_count");
}

function price_sale(jNode){
    var num = jNode.text().match(/\d+/g);
    data.price.sale = num?Number(num[0]):null;
    commit("price_sale");
}

function price_bid(jNode){
    data.price.bid = Number(jNode.text().replace(/\s/g,""));//58.0
    commit("price_bid");
}

//根据浏览器地址处理得到访问地址，除掉spm等临时信息，避免造成重复提交
//http://ffp.sichuanair.com/FFPNewWeb/Mall/Detail/12228
function web(link){
    var id = link.match(/\d+/g);//匹配后返回：12228
    return "https://ffp.sichuanair.com/FFPNewWeb/Mall/Detail/PRODUCTID".replace(/PRODUCTID/,id);
}

//转换为移动链接地址
//web: http://ffp.sichuanair.com/FFPNewWeb/Mall/Detail/12228
function wap(link){
    var id = link.match(/\d+/g);//匹配后返回：12228
    return "https://ffp.sichuanair.com/FFPNewWeb/Mall/Detail/PRODUCTID".replace(/PRODUCTID/,id);
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



