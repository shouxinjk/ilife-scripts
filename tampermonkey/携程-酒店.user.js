// ==UserScript==
// @name         携程-酒店
// @namespace    http://tampermonkey.net/
// @version      1.0
// @description  extract hotel
// @author       qchzhu

// @require http://118.190.75.121/dist/waitForKeyElements.js
// @require http://118.190.75.121/dist/md5.js
// @require http://118.190.75.121/dist/util.js?v=2.5
// @icon    http://www.shouxinjk.net/favicon.ico
// @match        http://hotels.ctrip.com/hotel/*
// @match        https://hotels.ctrip.com/hotel/*
// @grant        none
// ==/UserScript==

//示例URL
//http://hotels.ctrip.com/hotel/20058441.html#ctm_ref=www_hp_his_lst
//https://hotels.ctrip.com/hotel/375513.html#ctm_ref=hod_hp_hot_dl_n_28_6
this.$ = this.jQuery = jQuery.noConflict(true);//important: to remove jQuery conflict

var debug = false;//isProduction("ctrip");

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
    type:"hotel",
    source:"ctrip",
    title:null,
    summary:"",
    price:{
        bid:null,
        sale:null
    },
    images:[],
    tags:[],
    distributor:{
        name:"携程"
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
    }
};

var seed={//an example for extract urls
    task:{
        user:"userid",//注册的编码
        executor:"machine",//机器标识
        url:window.location.href//原始浏览地址
    },
    source:"ctrip",
    type:"hotel",
    url:document.location.href
};

var startTime = new Date().getTime();//用时间戳控制页面切换时间，开始时间
var commitTime = new Date().getTime()+5*1000;//记录最近一次提交数据时间，每次commit将修改改时间
var durationTime = Math.floor(Math.random()*10+5)*1000;//控制间隔毫秒数 5-15秒
var idleTime = 1000;//提交后等待1秒

var timerId = setInterval(next, 500);//需要设置页面跳转检查

(function() {
    'use strict';
    waitForKeyElements ("h2.cn_n", title);
    waitForKeyElements ("span[itemprop='description']", summary);
    waitForKeyElements ("div.special_label i", tags);
    waitForKeyElements ("#topPicList div div", images);
    waitForKeyElements ("a.commnet_score",rank_score);
    waitForKeyElements ("span[itemprop='reviewCount']",rank_count);
    //waitForKeyElements ("tr.tr-recommend",price);
    waitForKeyElements (".base_txtdiv:first",price_sale);//售价
    waitForKeyElements ("select.select_ctrip",tags_triptype);
    //commitUrl(seed);//here is an example
})();

function title(jNode){
    //console.log("titleEl",$("h2.cn_n"),jNode);
    data.title = jNode.text();
    commit("title");
}

function summary(jNode){
    data.summary = jNode.text().replace(/\s+/g,"");
    commit("summary");
}

function tags(jNode){
    var tag = jNode.text();
    if(data.tags.indexOf(tag)<0)
        data.tags.push(tag);
    commit("tags");
}

function tags_triptype(jNode){
    var types = [];//出游类型标签
    jNode.find("option[value!='-1']:parent").each(function(){//获取所有出游类型，包括类型及数量
        var t = $(this).text().split(/[\(\)]+/);
        var c = $(this).text().match(/\d+/);
        var type = {type:t[0],count:parseInt(c[0])};
        types.push(type);
    });
    types = types.sort(function (a, b) {//根据出游数量排序
        return a.count > b.count ? -1 : 1;
    });
    for(var i=0;i<types.length && i<3;i++){//取前3个标签
        data.tags.push(types[i].type);
    }
    commit("tags_triptype");
}

function images(jNode){
    var img = fullUrl(jNode.attr("_src"));
    if(data.images.indexOf(img)<0)
        data.images.push(img);
    commit("images");
}

function rank_score(jNode){
    var score = jNode.attr("title").match(/\d*\.*\d/g);//客户点评：4.2分，总分5分。
    data.rank.score = score[0];
    data.rank.base = score[1];
    commit("rank_score");
}

function rank_count(jNode){
    var count = jNode.text().match(/\d*\.*\d/g);//53位住客点评
    data.rank.count = count[0];
    commit("rank_count");
}

function price(jNode){
    data.price.bid = jNode.find("td div div.hlist_item_price2_sec").text().replace(/￥/g,"");
    data.price.sale = jNode.find("td div span.base_price").text().replace(/￥/g,"");
    commit("price");
}

function price_sale(jNode){
    data.price.sale = jNode.text().trim().replace(/¥/g,"").replace(/￥/g,"");
    commit("price_sale");
    price_bid(jNode);
}

function price_bid(jNode){
    if(jNode.parent().find(".hlist_item_price2_sec")){
        data.price.bid = jNode.parent().find(".hlist_item_price2_sec").text().trim().replace(/¥/g,"").replace(/￥/g,"");
        commit("price_bid");
    }
}

//转换为web链接地址：需要去除附加信息，确保唯一性
//原始: http://hotels.ctrip.com/hotel/435194.html?isFull=F#ctm_ref=hod_sr_lst_dl_n_1_4
//转换后: http://hotels.ctrip.com/hotel/435194.html
function web(link){
    var id = link.match(/\d+.html/)[0];//匹配后返回：435194.html
    return "http://hotels.ctrip.com/hotel/"+id;
}

//转换为移动链接地址
//web: http://hotels.ctrip.com/hotel/20058441.html
//wap: http://m.ctrip.com/webapp/Hotel/HotelDetail/20058441.html
function wap(link){
    var id = link.match(/\d+.html/)[0];//匹配后返回：20058441.html
    return "http://m.ctrip.com/webapp/Hotel/HotelDetail/"+id;
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
    return data.title && data.summary.length>0 && data.images.length>0 && data.price.sale && data.tags.length>0;
}

//navigate to next url
function next(){
    var duration = new Date().getTime()-startTime;
    var idle = new Date().getTime()-commitTime;
    var isPageTimeout = duration > durationTime && idle > idleTime;
    console.log("\n\n crawling ...",duration,durationTime,idle,idleTime,isPageTimeout);
    if( !debug && isPageTimeout ){_next();}
}



