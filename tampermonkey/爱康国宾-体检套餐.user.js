// ==UserScript==
// @name         爱康国宾-体检套餐
// @namespace    http://tampermonkey.net/
// @version      1.0
// @description  extract health check package
// @author       qchzhu

// @require http://118.190.75.121/dist/waitForKeyElements.js
// @require http://118.190.75.121/dist/md5.js
// @require http://118.190.75.121/dist/util.js?v=2.4
// @icon    http://www.shouxinjk.net/favicon.ico
// @match        http://mall.ikang.com/product-*
// @match        https://mall.ikang.com/product-*
// @grant        none
// ==/UserScript==

//示例URL
//http://mall.ikang.com/product-20400.html

//this.$ = this.jQuery = jQuery.noConflict(true);//important: to remove jQuery conflict

var debug = false;//isProduction("ikang");

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
    source:"ikang",
    title:null,
    summary:"",
    price:{
        bid:null,
        sale:null
    },
    images:[],
    tags:["体检"],
    distributor:{
        name:"爱康国宾"
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

var keys=["项目"];//将表头排除

var seed={//an example for extract urls
    task:{
        user:"userid",//注册的编码
        executor:"machine"//机器标识
    },
    source:"ikang",
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
    waitForKeyElements (".product-info h1", title);
    waitForKeyElements (".product-info h2", summary);//子标题作为正文
    waitForKeyElements ("#tab-description td", summary);//正文内容
    waitForKeyElements (".lebox>a", tags);
    waitForKeyElements (".le_img img", images);//幻灯图片
    waitForKeyElements ("#tab-description img", images);//正文图片
    waitForKeyElements (".percentum",rank_score);
    waitForKeyElements ("span:contains('商品评论')",rank_count);
    waitForKeyElements (".price",price_sale);
    waitForKeyElements (".pay-box2",price_bid);
    waitForKeyElements ("span:contains('【体检项目】')",props);
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

function tags(jNode){
    var tags = jNode.text().split("，");
    for(var i=0;i<tags.length;i++){
        var tag = tags[i].trim();
        if(tag.length>0 && data.tags.indexOf(tag)<0){
            data.tags.push(tag);
        }
        commit("tags");
    }
}

function images(jNode){
    var img = fullUrl(jNode.attr("src"));
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
    data.rank.score = Number(jNode.text().trim())/20;
    data.rank.base = 5;
    commit("rank_score");
}

function rank_count(jNode){
    data.rank.count = Number(jNode.text().match(/\d+/)[0]);
    commit("rank_count");
}

function price_sale(jNode){
    var price = jNode.text().match(/\d+\.*\d*/g);
    data.price.sale = Number(price[0]);
    commit("price_sale");
}

function price_bid(jNode){
    var price = jNode.text().match(/\d+\.*\d*/g);
    data.price.bid = Number(price[0]);
    commit("price_bid");
}

function props(jNode){
    jNode.parent().next().find("tr").each(function(){
        if($(this).find("td").length>3){//仅选择有值的列表
            var key = $(this).find("td:nth-child(1)").text().trim();//选第一个作为key
            var value = $(this).find("td:nth-child(2)").text().trim();//选第二个作为value
            var description = $(this).find("td:nth-child(3)").text().trim();//选第三个作为备注
            var prop = {
                key:key,
                value:value,
                description:description
            };
            if(keys.indexOf(key)<0){
                data.props.push(prop);
                keys.push(key);
            }
        }
    });
    commit("props");
}

//http://mall.ikang.com/product-20400.html
function web(link){
    var ids = link.match(/\d+/g);
    return "https://mall.ikang.com/product-"+ids[0]+".html";
    //return "http://mall.ikang.com"+window.location.pathname;
}


//web: http://mall.ikang.com/product-20400.html
//wap: http://m.mall.ikang.com/product/20400
function wap(link){
    var ids = link.match(/\d+/g);
    return "http://m.mall.ikang.com/product/"+ids[0];
}

//commit data
function commit(key){
    if(validate()){
        if(debug)console.log("validate succeed. [prop]"+key,data);
        commitData(data,next);
        commitTime = new Date().getTime();
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




