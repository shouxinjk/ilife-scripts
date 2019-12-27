// ==UserScript==
// @name         同程-线路-国内游
// @namespace    http://tampermonkey.net/
// @version      1.0
// @description  采集同程国内游数据
// @require http://118.190.75.121/dist/waitForKeyElements.js
// @require http://118.190.75.121/dist/md5.js
// @require http://118.190.75.121/dist/util.js?v=2.4
// @icon    http://www.shouxinjk.net/favicon.ico
// @author       qchzhu
// @match        https://gny.ly.com/line/*
// @grant        none
// ==/UserScript==

//示例URL
//https://gny.ly.com/line/t1j3p1067371c324.html
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
    url:web(window.location.href),//必须：作为来源唯一识别。但实际跳转地址通过link给出
    type:"line",
    source:"tongcheng",
    distributor:{
        name:"同程"
    },
    title:null,
    tags:[],
    summary:"",
    price:{
        bid:null,
        sale:null
    },
    images:[],
    rank:{
        score:null,
        base:5,
        count:null,
        match:0.75//by default
    },
    link:{
        web:web(window.location.href),//web浏览地址
        wap:wap(window.location.href)//移动端浏览地址，默认与web一致
    },
    props:[]
};

var seed={//an example for extract urls
    task:{
        user:"userid",//注册的编码
        executor:"machine",//机器标识
        url:document.location.href,
    },
    source:"tongcheng",
    type:"line",
    url:document.location.href
};

var startTime = new Date().getTime();//用时间戳控制页面切换时间，开始时间
var commitTime = new Date().getTime()+5*1000;//记录最近一次提交数据时间，每次commit将修改改时间
var durationTime = Math.floor(Math.random()*10+5)*1000;//控制间隔毫秒数 5-15秒
var idleTime = 1000;//提交后等待1秒

(function() {
    'use strict';
    setTimeout(extract, 1000);//等待2秒加载价格
    //commitUrl(seed);//here is an example
})();

function extract(){
    setInterval(next, 500);//需要设置页面跳转检查
    params();
    waitForKeyElements (".mainTitle", title);
    waitForKeyElements ("#PriceHolder", price);
    waitForKeyElements (".slider-content li a img", images);
    waitForKeyElements (".recommend-content", summary);
    //waitForKeyElements (".lineDays_div span:parent",days);
    //waitForKeyElements (".dp-count b:parent",rank_count);
    waitForKeyElements (".dp-tourists b:parent",rank_count);//
    waitForKeyElements (".dp-score b:parent",rank_score);
    waitForKeyElements (".features dd span",tags_product);
    waitForKeyElements (".grade_feel .dp-tap-l",tags);
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
    data.title = jNode.text();
    commit();
}

function price(jNode){
    data.price.sale = Number(jNode.text().trim());
    //if(data.price.bid === null)data.price.bid = jNode.text();//if we cannot get bid price
    commit();
}

function images(jNode){
    data.images.push(fullUrl(jNode.attr("src")));
    commit();
}

/*
处理标签，其中“最新”、“全部”标记需要清除
*/
function tags(jNode){
    var tag = jNode.text().replace(/（\d+）/g,"");//清除数量标记
    if(tag.length>2 && data.tags.indexOf(tag)<0){
        data.tags.push(tag);
    }
    commit("tags");
}

function tags_product(jNode){
    var tag = jNode.text().trim();
    if(tag.length>0 && data.tags.indexOf(tag)<0){
        data.tags.push(tag);
    }
    commit("tags_product");
}

function summary(jNode){
    data.summary += jNode.text().trim()+"<br/>";
    commit();
}

function days(jNode){
    data.days=jNode.text();
    commit();
}

function rank_count(jNode){
    var num = jNode.text().match(/\d+/);//（64）条
    data.rank.count = Number(num);
    commit("rank_count");
}

function rank_score(jNode){
    var num = jNode.text().match(/\d+/);
    data.rank.score=Number(num)/20;
    commit("rank_score");
}

//清除为仅包含lineid的链接地址
//目标地址: https://gny.ly.com/line/t1j3p1067371c324.html
//访问地址: https://gny.ly.com/line/t1j3p1067371c324.html
function web(link){
    var id = link.match(/line\/[a-z0-9A-Z]+\.html/)[0];//匹配后返回：line/t1j3p1067371c324.html
    return "https://gny.ly.com/"+id;
}

//转换为移动链接地址
//web: https://gny.ly.com/line/t1j3p1067371c324.html
//wap: https://m.ly.com/guoneiyou/line/t1j3p1067371c324.html
function wap(link){
    var id = link.match(/line\/[a-z0-9A-Z]+\.html/)[0];//匹配后返回：line/t1j3p1067371c324.html
    return "https://m.ly.com/guoneiyou/"+id;
}

//commit data
function commit(){
    commitTime = new Date().getTime();
    if(validate()){
        if(debug)console.log("validate success. now commit data.",data);
        commitData(data,next);
    }else{
        if(debug)console.log("validate failed. do not commit data.",data);
    }
}

//validate data collected
function validate(){
    //TODO use json schema to validate data
    return data.title && data.summary.length>0 && data.images.length>0 && data.price.sale;
}

//navigate to next url
function next(){
    var duration = new Date().getTime()-startTime;
    var idle = new Date().getTime()-commitTime;
    var isPageTimeout = duration > durationTime && idle > idleTime;
    console.log("\n\n crawling ...",duration,durationTime,idle,idleTime,isPageTimeout);
    if( !debug && isPageTimeout ){_next();}
}