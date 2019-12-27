// ==UserScript==
// @name         同程-邮轮
// @namespace    http://tampermonkey.net/
// @version      1.0
// @description  extract cruise line
// @author       qchzhu

// @require http://118.190.75.121/dist/waitForKeyElements.js
// @require http://118.190.75.121/dist/md5.js
// @require http://118.190.75.121/dist/util.js?v=2.5
// @icon    http://www.shouxinjk.net/favicon.ico
// @match        https://www.ly.com/youlun/tours-*
// @grant        none
// ==/UserScript==

//示例URL
//https://www.ly.com/youlun/tours-221485.html?lid=100
if(this.jQuery){
    this.$ = this.jQuery = jQuery.noConflict(true);//important: to remove jQuery conflict
}

var debug = false;//isProduction("tongcheng");

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
    type:"cruise",
    source:"tongcheng",
    title:null,
    summary:"",
    price:{
        bid:null,
        sale:null
    },
    images:[],
    tags:[],
    distributor:{
        name:"同程"
    },
    seller:{
        name:null,
    },
    producer:{
        name:null,
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
        executor:"machine",//机器标识
        url:window.location.href//原始浏览地址
    },
    source:"tongcheng",
    type:"cruise",
    url:document.location.href
};

var startTime = new Date().getTime();//用时间戳控制页面切换时间，开始时间
var commitTime = new Date().getTime()+5*1000;//记录最近一次提交数据时间，每次commit将修改改时间
var durationTime = Math.floor(Math.random()*10+5)*1000;//控制间隔毫秒数 5-15秒
var idleTime = 1000;//提交后等待1秒

var timerId = setInterval(next, 500);//需要设置页面跳转检查


(function() {
    'use strict';
    //waitForKeyElements (".crumbs a:contains('携程旅游')", extract);//采集团队游线路
    setTimeout(extract, 1000);//等待2秒加载价格
    //commitUrl(seed);//here is an example
})();

function extract(){
    if(debug){console.log("extract detail ...");}
    params();//从链接中提取标签
    waitForKeyElements (".pro-title", title);
    waitForKeyElements (".scores_litem dd", tags);
    waitForKeyElements (".pro-feat-inner a", tags_product);
    waitForKeyElements (".site-map a", tags_crumb);
    waitForKeyElements (".pro-img img", images_slide);
    waitForKeyElements (".rates",rank_score);
    waitForKeyElements (".comment",rank_count);
    waitForKeyElements (".pro-price",price_sale);//售价
    waitForKeyElements (".top_tt_des span",supplier);//供应商
    waitForKeyElements (".pro-intro span",props);
    waitForKeyElements ("meta[name='description']", summary);
    waitForKeyElements ("#favourableInfo img", images);
}

//从地址中获取标签
//参数形式为： tags=xxx,yyy,zzz
function params(){
    var q = _getQuery();
    if(q.tags && q.tags.length>0){//tags=xxx,sss,ddd
        var tags = q.tags.split(",");
        for(var i=0;i<tags.length;i++){
            var tag = tags[i];
            if(tag.length>0 && data.tags.indexOf(tag)<0){
                data.tags.push(tag);
            }
        }
        commit("url_tags");
    }
}

function title(jNode){
    data.title = jNode.text().replace(/\s+/g," ").trim();
    commit("title");
}

function summary(jNode){
    data.summary += jNode.attr("content").replace(/\s+/g," ").trim()+"</br>";
    commit("summary");
}

function tags(jNode){
    var tag = jNode.text().replace(/\(\d+\)/g,"");
    if(tag.trim().length>2 && tag.trim().length<10 && data.tags.indexOf(tag)<0){
        data.tags.push(tag);
    }
    commit("tags");
}

function tags_crumb(jNode){
    var tag = jNode.text().trim();
    if(tag.trim().length>2 && tag.trim().length<10 && data.tags.indexOf(tag)<0 && tag.trim() != "同程首页"){
        data.tags.push(tag);
    }
    commit("tags_crumb");
}

function tags_product(jNode){
    var tag = jNode.text().replace(/\s+/g," ").trim();
    if(tag.trim().length>2 && tag.trim().length<10 && data.tags.indexOf(tag)<0){
        data.tags.push(tag);
    }
    commit("tags_product");
}

function props(jNode){
    var txt = jNode.text().replace(/：/g,":").replace(/\n/g,"").replace(/\s/g,"").split(":");//吨位：13.7万吨
    if(txt && txt.length>1){
        var prop = {
            key:txt[0],
            value:txt[1]
        };
        data.props.push(prop);
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

//判定尺寸后提交，需要大于100*100
function checkImage(img_url){
    var img = new Image();
    img.src = img_url;
    if(img.complete){// 如果有缓存则直接获取
        if(debug)console.log('img.complete.width:'+img.width+',height:'+img.height);
        if(img.width>=100 && img.height>=100 && data.images.indexOf(img_url)<0){
            data.images.push(img_url);
            commit("images");
        }
    }else{// 否则待加载完成执行
        img.onload = function(){
            if(debug)console.log('img.onload.width:'+img.width+',height:'+img.height);
            if(img.width>=100 && img.height>=100 && data.images.indexOf(img_url)<0){
                data.images.push(img_url);
                commit("images");
            }
        }
    }
}

function rank_score(jNode){
    var score = jNode.text().match(/\d+\.*\d*/g);
    data.rank.score = score&&score[0]?Number(score[0]).toFixed(1):null;
    data.rank.base = 5;
    commit("rank_score");
}

function rank_count(jNode){
    var count = jNode.text().match(/\d+/g);
    data.rank.count = count&&count[0]?Number(count[0]):null;
    commit("rank_count");
}

function price_sale(jNode){
    var price = jNode.text().match(/\d+\.*\d*/g)[0];
    data.price.sale =price?Number(price):null;
    commit("price_sale");
}

function location_from(jNode){
    var city = jNode.text().trim().replace(/出发地：/,"");//出发地：成都
    if(data.location.from.indexOf(city)<0){
        data.location.from.push(city);
        commit("location_from");
    }
}

function supplier(jNode){
    data.producer.name = jNode.parent().find("dd").text().trim().replace(/\s+/g,"");//供应商：携程自营
    commit("supplier");
}

//转换为web链接地址：需要去除附加信息，确保唯一性
//原始: https://www.ly.com/youlun/tours-221485.html?***
//转换后: https://www.ly.com/youlun/tours-221485.html
function web(link){
    var id = link.match(/tours-\d+/);//tours-221485
    return "https://www.ly.com/youlun/"+id+".html";
}

//转换为移动链接地址
//原始: https://www.ly.com/youlun/tours-221485.html?***
//转换后: https://www.ly.com/youlun/tours-221485.html
function wap(link){
    var id = link.match(/tours-\d+/);//tours-221485
    return "https://www.ly.com/youlun/"+id+".html";
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
    return data.title && data.images.length>0 && data.price.sale && data.tags.length>0;
}

//navigate to next url
function next(){
    var duration = new Date().getTime()-startTime;
    var idle = new Date().getTime()-commitTime;
    var isPageTimeout = duration > durationTime && idle > idleTime;
    console.log("\n\n crawling ...",duration,durationTime,idle,idleTime,isPageTimeout);
    if( !debug && isPageTimeout ){_next();}
}



