// ==UserScript==
// @name         DHC-日本化妆品及保健品
// @namespace    http://tampermonkey.net/
// @version      1.0
// @description  extract freetour line
// @author       qchzhu
// @require http://code.jquery.com/jquery-latest.js
// @require http://118.190.75.121/dist/waitForKeyElements.js
// @require http://118.190.75.121/dist/md5.js
// @require http://118.190.75.121/dist/util.js?v=2.4
// @icon    http://www.shouxinjk.net/favicon.ico
// @match        http://www.dhc.net.cn/gds/detail.jsp?gcd=*
// @match        https://www.dhc.net.cn/gds/detail.jsp?gcd=*
// @grant        none
// ==/UserScript==

//示例URL
//http://www.dhc.net.cn/gds/detail.jsp?gcd=3901

//this.$ = this.jQuery = jQuery.noConflict(true);//important: to remove jQuery conflict

var debug = false;//isProduction("dhc");

var schema={
//TODO: validate and commit
};

var keys = [];

var data={
    task:{
        user:"userid",//注册的编码
        executor:"machine",//机器标识
            timestamp:new Date().getTime(),//时间戳
            url:window.location.href//原始浏览地址
    },
    url:web(window.location.href),
    type:"dietary",
    source:"dhc",
    title:null,
    summary:"",
    price:{
        bid:null,
        sale:null
    },
    images:[],
    tags:["日本制"],
    props:[],
    distributor:{
        name:"DHC"
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
    source:"dhc",
    type:"dietary",
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
    params();
    waitForKeyElements (".frabic-detail-right h3", title);
    waitForKeyElements (".detail-txt", summary);
    waitForKeyElements ("span.detail", summary);
    waitForKeyElements ("input[id='typea1']", tags);
    waitForKeyElements (".frabic-detail-left img", images);//logo
    waitForKeyElements (".detail img", images);//正文部分的图片提取
    //waitForKeyElements (".star5",rank_score);//没有评分
    //waitForKeyElements ("span[itemprop='reviewCount']",rank_count);//没有评分
    //waitForKeyElements ("#ECS_SHOPPRICE",price_sale);
    //waitForKeyElements (".market:first",price_bid);
    waitForKeyElements ("div[class*='detail-chose']",props);
    //commitUrl(seed);//here is an example
})();

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

function venu(jNode){
    data.venu = jNode.text().replace(/\s+/g,"").replace(/演出场馆：/g,"");
    commit("venu");
}

function tags(jNode){
    var tag=jNode.val();
    if(data.tags.indexOf(tag)<0){
        data.tags.push(tag);
    }
    commit("tags");
}

function images(jNode){
    var img = fullUrl(jNode.attr("src"));
    if(data.images.indexOf(img)<0)
        data.images.push(img);
    commit("images");
}

function rank_score(jNode){
    var score = jNode.attr("title").match(/\d*\.*\d/g);//5星。
    data.rank.score = score[0];
    data.rank.base = 5;
    commit("rank_score");
}

function rank_count(jNode){
    var count = jNode.text().match(/\d*\.*\d/g);//53位住客点评
    data.rank.count = count[0];
    commit("rank_count");
}

function price_sale(jNode){
    var price = jNode.text().match(/\d+/g);
    data.price.sale = price[0];
    commit("price_sale");
}

function price_bid(jNode){
    var price = jNode.text().match(/\d+/g);
    data.price.bid = price[0];
    commit("price_bid");
}

function props(jNode){
    if(jNode.find("span:first") && jNode.find("strong:first")){
        var key = jNode.find("span:first").text().trim();
        var value = jNode.find("strong:first").text().trim();
        var prop = {
            //key:key,
            //value:value
        };
        prop[key]=value;
        if(keys.indexOf(key)<0){
            data.props.push(prop);
            keys.push(key);
        }
        //将产地、品牌、产品剂型作为tag
        if(key == "商品价格"){
            data.price.sale = Number(value);
        }
        commit("props");
    }
}

//根据浏览器地址处理得到访问地址，除掉spm等临时信息，避免造成重复提交
//http://www.dhc.net.cn/gds/detail.jsp?gcd=3901
function web(link){
    var str = link.match(/\d+/)[0];//匹配后返回：3901
    return "https://www.dhc.net.cn/gds/detail.jsp?gcd="+str;
}

//转换为移动链接地址
//web：http://www.dhc.net.cn/gds/detail.jsp?gcd=3901
//wap：http://www.dhc.net.cn/gds/detail.jsp?gcd=3901
function wap(link){
    var str = link.match(/\d+/)[0];//匹配后返回：3901
    return "https://www.dhc.net.cn/gds/detail.jsp?gcd="+str;
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



