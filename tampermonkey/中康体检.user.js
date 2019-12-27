// ==UserScript==
// @name         中康体检
// @namespace    http://tampermonkey.net/
// @version      1.0
// @description  extract health check package
// @author       qchzhu

// @require http://118.190.75.121/dist/waitForKeyElements.js
// @require http://118.190.75.121/dist/md5.js
// @require http://118.190.75.121/dist/util.js?v=2.4
// @icon    http://www.shouxinjk.net/favicon.ico
// @match        http://www.viptijian.com/*
// @match        https://www.viptijian.com/*
// @grant        none
// ==/UserScript==

//示例URL
//http://www.viptijian.com/028/cddyyy-combo-16787

//this.$ = this.jQuery = jQuery.noConflict(true);//important: to remove jQuery conflict

var debug = false;//isProduction("viptijian");

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
    url:window.location.href,
    type:"health",
    source:"viptijian",
    title:null,
    summary:"",
    address:"",
    price:{
        bid:null,
        sale:null
    },
    images:[],
    tags:["体检"],
    distributor:{
        name:"中康体检"
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
    props:[]
};

var keys=[];

var seed={//an example for extract urls
    task:{
        user:"userid",//注册的编码
        executor:"machine"//机器标识
    },
    source:"viptijian",
    type:"health",
    taskUrl:document.location.href,
    url:document.location.href
};

var startTime = new Date().getTime();//用时间戳控制页面切换时间，开始时间
var commitTime = new Date().getTime()+5*1000;//记录最近一次提交数据时间，每次commit将修改改时间
var durationTime = Math.floor(Math.random()*10+5)*1000;//控制间隔毫秒数 5-15秒
var idleTime = 1000;//提交后等待1秒

var timerId = setInterval(next, 500);//需要设置页面跳转检查

(function() {
    'use strict';
    waitForKeyElements (".commodity_right h1", title);
    waitForKeyElements (".commodity_right_one", summary);//子标题作为正文
    waitForKeyElements ("p:contains('等级:')", tags_hospital);//医院等级作为tag
    waitForKeyElements (".right_five_a em", tags);
    waitForKeyElements (".scroll img", images);//幻灯图片
    waitForKeyElements (".details_one .text-hide", props_package);//套餐属性
    waitForKeyElements ("span:contains('评价: ')",rank_score);
    waitForKeyElements (".right_two_b p:contains('预约成功')",rank_count);
    waitForKeyElements ("span:contains('预约价')",price_sale);
    waitForKeyElements ("span:contains('医院价')",price_bid);
    waitForKeyElements (".Programlistbox",props);//套餐检查项目
    waitForKeyElements (".adr p:contains('地址：')",address);//地址。如果有多个只取第一个
    //commitUrl(seed);//here is an example
})();

function title(jNode){
    data.title = jNode.text().trim();
    commit("title");
}

function summary(jNode){
    if(jNode.text().trim().length>0){
        data.summary = data.summary+jNode.text().trim()+"<br/>";
        commit("summary");
    }
}

function address(jNode){
    data.address = jNode.text().replace(/地址：/g,"").replace(/\s+/g,"");
    commit("address");
}

function tags(jNode){
    var tags = jNode.text().replace(/\s+/g,",").split(",");
    for(var i=0;i<tags.length;i++){
        var tag = tags[i].trim();
        if(tag.length>0 && data.tags.indexOf(tag)<0){
            data.tags.push(tag);
        }
        commit("tags");
    }
}

function tags_hospital(jNode){
    var tag = jNode.text().replace(/等级: /g,"").replace(/\[/g,"").replace(/\]/g,"").trim();
    if(tag.length>0 && data.tags.indexOf(tag)<0){
        data.tags.push(tag);
    }
    commit("tags");
}

function tags_crowd(jNode){
    var tag = jNode.text().trim();
    if(tag.length>0 && data.tags.indexOf(tag)<0){
        data.tags.push(tag);
    }
    commit("tags");
}

function images(jNode){
    var img = fullUrl(jNode.attr("src"));
    checkImage(img);
}

//判定尺寸后提交，需要大于300*200
function checkImage(img_url){
    var img = new Image();
    img.src = img_url;
    if(img.complete){// 如果有缓存则直接获取
        if(debug)console.log('img.complete.width:'+img.width+',height:'+img.height);
        if(img.width>=300 && img.height>=200 && data.images.indexOf(img_url)<0){
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
    data.rank.score = Number(jNode.parent().text().match(/\d+\.*\d*/g)[0]);
    data.rank.base = 5;
    commit("rank_score");
}

function rank_count(jNode){
    data.rank.count = Number(jNode.parent().text().match(/\d+/)[0]);
    commit("rank_count");
}

function price_sale(jNode){
    var price = jNode.parent().text().match(/\d+\.*\d*/g);
    data.price.sale = Number(price[0]);
    commit("price_sale");
}

function price_bid(jNode){
    var price = jNode.parent().text().match(/\d+\.*\d*/g);
    data.price.bid = Number(price[0]);
    commit("price_bid");
}

function props(jNode){
    if(jNode.find(".Programname-txt") && jNode.find(".Programworth-txt")){
        var key = jNode.find(".Programname-txt").text().trim();
        var value = jNode.find(".Programworth-txt").text().trim();
        var prop = {
            //key:key,
            //value:value
        };
        if(keys.indexOf(key)<0){
            prop[key]=value;
            data.props.push(prop);
            keys.push(key);
        }
        commit("props");
    }
}

function props_package(jNode){
    var txt = jNode.text().replace(/\s+/g," ").replace(/：/g,":").split(":");
    if(txt.length>1){
        var key = txt[0].trim();
        var value = txt[1].trim();
        var prop = {
            //key:key,
            //value:value
        };
        if(keys.indexOf(key)<0){
            prop[key]=value;
            data.props.push(prop);
            keys.push(key);
        }
        commit("props_package");
    }
}

//https://www.viptijian.com/028/cddyyy-combo-16787
function web(link){
    var ids = link.match(/\d+/g);
    return "https://www.viptijian.com"+window.location.pathname;
}


//web: https://www.viptijian.com/028/cddyyy-combo-16787
//wap: https://m.viptijian.com/028/cddyyy-combo-16787
function wap(link){
    var ids = link.match(/\d+/g);
    return "https://m.viptijian.com"+window.location.pathname;
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




