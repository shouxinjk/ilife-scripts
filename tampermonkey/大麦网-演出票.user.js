// ==UserScript==
// @name         大麦网-演出票
// @namespace    http://tampermonkey.net/
// @version      1.0
// @description  extract freetour line
// @author       qchzhu
// @require http://code.jquery.com/jquery-latest.js
// @require http://118.190.75.121/dist/waitForKeyElements.js
// @require http://118.190.75.121/dist/md5.js
// @require http://118.190.75.121/dist/util.js?v=2.4
// @icon    http://www.shouxinjk.net/favicon.ico
// @match        https://detail.damai.cn/item.htm*
// @grant        none
// ==/UserScript==

//示例URL
//https://detail.damai.cn/item.htm?spm=a2oeg.home.card_0.ditem_6.591b23e1C27mka&id=605874865373

//this.$ = this.jQuery = jQuery.noConflict(true);//important: to remove jQuery conflict

var debug = false;//isProduction("damai");

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
    type:"ticket",
    source:"damai",
    title:null,
    summary:"",
    price:{
        bid:null,
        sale:null
    },
    images:[],
    tags:[],
    distributor:{
        name:"大麦网"
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
        executor:"machine"//机器标识
    },
    source:"damai",
    type:"ticket",
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
    waitForKeyElements ("title", title);
    waitForKeyElements (".time", summary);//演出时间作为摘要
    waitForKeyElements (".perform-notice-content", summary);//预售提示
    waitForKeyElements (".notice0 .words", summary);//购票须知
    waitForKeyElements (".notice0 .words", summary);//观演须知
    waitForKeyElements (".perform-notice-prefix span",tags_notice);//注意事项如预售
    waitForKeyElements (".service-note-name", tags_notice);//警示事项
    waitForKeyElements (".cityitem", tags_city);//城市

    //waitForKeyElements ("script:contains('page.setTags')", tags);//直接从原始脚本内提取
    waitForKeyElements (".addr",address);
    waitForKeyElements (".poster", images_logo);//logo
    waitForKeyElements (".words img", images);//正文部分的图片提取
    waitForKeyElements ("a.commnet_score",rank_score);//没有评分
    waitForKeyElements ("span[itemprop='reviewCount']",rank_count);//没有评分
    waitForKeyElements (".totol__price",price);
    //commitUrl(seed);//here is an example
})();

function title(jNode){
    data.title = jNode.text().replace(/【网上订票】- 大麦网/g,"").trim();//"【宁波】2019张信哲“未来式”巡回演唱会——宁波站【网上订票】- 大麦网"
    commit("title");
}

function summary(jNode){
    var txt = jNode.text().replace(/\s+/g," ").trim();
    if(txt.length>0){
        data.summary += txt+"<br/>";
        commit("summary");
    }
}

function tag_category_city(jNode){
    tags(jNode);//处理tags
    tags_category(jNode);//处理分类tags
    city(jNode);//获取演出城市
}

/*
从脚本中提取原始数据：注意：由于在同一个元素内，只能捕获一次并加以处理
page.setCategory(['音乐会', '音乐会']);//该演出对应的三级类目
page.setTags(["儿童亲子","动漫"]);//该演出的其他TAG
*/
function tags(jNode){
    var str = jNode.text().match(/page.setTags[^;]+;/)[0];//匹配后返回：page.setTags(["儿童亲子","动漫"]);
    var tags = str.match(/"[^"]+"/g);//返回："儿童亲子","动漫"
    for(var i=0;tags&&i<tags.length;i++){
        var tag = tags[i].replace(/"/g,"");
        if(data.tags.indexOf(tag)<0){
            data.tags.push(tag);
        }
    }
    commit("tags");
}

function tags_city(jNode){
    var tag = jNode.text().trim();
    if(data.tags.indexOf(tag)<0){
        data.tags.push(tag);
    }
    commit("tags_notice");
}

function tags_notice(jNode){
    var tag = jNode.text().trim();
    if(data.tags.indexOf(tag)<0){
        data.tags.push(tag);
    }
    commit("tags_notice");
}

function address(jNode){
    var txt = jNode.text().replace(/场馆：/g,"").replace(/\|/g,"").replace(/\s+/g," ").trim();//场馆：宁波市 | 宁波奥体中心体育馆
    data.address = txt;
    commit("address");
}

/*
从脚本中提取原始数据
page.setCategory(['音乐会', '音乐会']);//该演出对应的三级类目
page.setTags(["儿童亲子","动漫"]);//该演出的其他TAG
*/
function tags_category(jNode){
    var str = jNode.text().match(/page.setCategory[^;]+;/)[0];//匹配后返回：page.setCategory(['音乐会', '音乐会']);
    //console.log("category tags.",str);
    var tags = str.match(/'[^']+'/);//返回：'音乐会', '音乐会'
    for(var i=0;i<tags.length;i++){
        var tag = tags[i].replace(/'/g,"");
        if(data.tags.indexOf(tag)<0){
            data.tags.push(tag);
        }
    }
    commit("tags_category");
}

function city(jNode){
    var str = jNode.text().match(/page.view\([^\)]+\)/)[0];//
    var strJson = str.match(/{[^}]+}/)[0].replace(/\$/g,"").replace(/'/g,'"').replace(/\s/g,"");//
    var json = JSON.parse(strJson);
    //console.log("original page object.",json);
    data.city = json.aad;
    data.venue = json.avn;
    commit("city && venue");
}

function images_logo(jNode){
    var img = fullUrl(jNode.attr("data-src").replace(/_\.webp/g,""));
    if(data.images.indexOf(img)<0)
        data.images.push(img);
    commit("images");
}

function images(jNode){
    var img = fullUrl(jNode.attr("src").replace(/_\.webp/g,""));
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
    data.price.sale = Number(jNode.text().match(/\d+\.*\d*/g)[0]);
    commit("price");
}

//根据浏览器地址处理得到访问地址，除掉spm等临时信息，避免造成重复提交
function web(link){
    var str = link.match(/id=\d+/)[0];
    return "https://detail.damai.cn/item.htm?"+str;
}

//转换为移动链接地址
function wap(link){
    var str = link.match(/id=\d+/)[0];
    var id = str.match(/\d+/)[0];
    return "https://m.damai.cn/damai/detail/item.html?itemId="+id;
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



