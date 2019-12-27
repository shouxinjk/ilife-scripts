// ==UserScript==
// @name         同程-线路-周边游
// @namespace    http://tampermonkey.net/
// @version      1.0
// @description  采集同程周边游数据
// @require http://118.190.75.121/dist/waitForKeyElements.js
// @require http://118.190.75.121/dist/md5.js
// @require http://118.190.75.121/dist/util.js?v=2.4
// @icon    http://www.shouxinjk.net/favicon.ico
// @author       qchzhu
// @match        https://zby.ly.com/detail/?lineid=*
// @match        http://zby.ly.com/detail/?lineid=*
// @match        https://zby.ly.com/detail?lineid=*
// @match        http://zby.ly.com/detail?lineid=*
// @grant        none
// ==/UserScript==

//示例URL
//https://zby.ly.com/detail/?lineid=70231
//https://zby.ly.com/detail/?lineid=110491&/

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
    days:null,
    images:[],
    rank:{
        score:null,
        base:100,
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

var timerId = setInterval(next, 500);//需要设置页面跳转检查

(function() {
    'use strict';
    waitForKeyElements ("h4.lineTitle_h4:parent", title);
    waitForKeyElements (".price_span em:parent", price);
    waitForKeyElements (".eachMo .imgBox img", images);
    waitForKeyElements (".eachMo .introduction", summary);
    waitForKeyElements (".lineDays_div span:parent",days);
    waitForKeyElements (".dp_tab .active em:parent",rank_count);
    waitForKeyElements (".dp_info1 .dp_p1 i:parent",rank_score);
    waitForKeyElements (".dp_info4 li:parent",tags);
    commitUrl(seed);//here is an example
})();

function title(jNode){
    data.title = jNode.text();
    commit();
}

function price(jNode){
    data.price.sale = jNode.text();
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
    var tag = jNode.text().replace(/（\d+）/g,"").replace(/全部/g,"").replace(/最新/g,"");//清除数量标记
    if(tag.length>0 && data.tags.indexOf(tag)<0){
        data.tags.push(tag);
    }
    commit("tags");
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
    data.rank.count=jNode.text().trim().match(/\d+/)[0];//（64）条
    commit("rank_count");
}

function rank_score(jNode){
    data.rank.score=jNode.text().trim();
    commit("rank_score");
}

//清除为仅包含lineid的链接地址
//目标地址: https://zby.ly.com/detail/?lineid=70231
//访问地址: https://zby.ly.com/detail/?lineid=70231#detailInfo_contain_id
function web(link){
    var id = link.match(/lineid=\d+/)[0];//匹配后返回：lineid=70231
    return "https://zby.ly.com/detail/?"+id;
}

//转换为移动链接地址
//web: https://zby.ly.com/detail/?lineid=70231
//wap: https://m.ly.com/zby/detail?lineid=70231
function wap(link){
    var id = link.match(/lineid=\d+/)[0];//匹配后返回：lineid=70231
    return "https://m.ly.com/zby/detail?"+id;
}

//commit data
function commit(){
    if(validate()){
        if(debug)console.log("validate success. now commit data.",data);
        commitData(data,next);
        commitTime = new Date().getTime();
    }else{
        if(debug)console.log("validate failed. do not commit data.",data);
    }
}

//validate data collected
function validate(){
    //TODO use json schema to validate data
    return data.title && data.summary.length>0 && data.images.length>0 && data.price.sale && data.days;
}

//navigate to next url
function next(){
    var duration = new Date().getTime()-startTime;
    var idle = new Date().getTime()-commitTime;
    var isPageTimeout = duration > durationTime && idle > idleTime;
    console.log("\n\n crawling ...",duration,durationTime,idle,idleTime,isPageTimeout);
    if( !debug && isPageTimeout ){_next();}
}