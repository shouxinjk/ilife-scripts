
/**
效率助手，提供携程辅助功能。包含以下功能：
1，在网页聊天界面获取聊天列表，并获取最近回复消息
2，能够判断消息是客人发送，还是员工回复
3，对于客人发送消息开启计时功能，能够在最后截止时间前提醒对应员工即时回复，在计时截止时能够自动回复
4，能够采用知识库内容或ChatGPT内容进行回复，用户可手动选择，在自动回复时可自动选择
5，在自动答复时通过企业微信通知用户
*/
var _sxdebug = true;

//默认达人信息
var brokerName = "请登录";
var brokerLogo = "https://biglistoflittlethings.com/ilife-web-wx/images/icon.jpeg";
//var loginUrl = "https://sidebar.biglistoflittlethings.com/login?origin=helper"; //默认登录地址
var loginUrl = "https://sidebar.biglistoflittlethings.com/c2b/toolbar/helper";//默认登录地址
function sxInitialize(jNode){
    //监听达人扫码绑定消息
    listenPostMessage();

    //设置操作按钮：显示或隐藏
    var htmlBtn = "";
    htmlBtn += '<div id="sxHideBtnDiv" class="sxinfo" style="position:fixed;z-index:2147483647;top:0px;right:0px;background-color:#fff;width:50px;height:20px;border-radius:5px;display:none">';
    htmlBtn += '<div style="line-height:22px;color:grey;background-color:#fff">隐藏</div>';
    htmlBtn += '</div>';
    //show btn
    htmlBtn += '<div id="sxShowBtnDiv" class="sxinfo" style="position:fixed;z-index:2147483647;top:0px;right:0;background-color:#fff;width:44px;height:150px;border-radius:5px;padding-left:12px;display:block">';
    htmlBtn += '<div class="info-general">';
    htmlBtn += '<img class="general-icon" src="'+brokerLogo+'" width="30" height="30"/>';
    htmlBtn += '</div>';
    htmlBtn += '<div class="info-detail" style="text-align:left">';
    htmlBtn += '<div class="info-text info-blank" style="color:#000;font-size:14px;height:100px;background-color:#fff">智<br/>能<br/>助<br/>手</div>';
    htmlBtn += '</div>';

    jNode.append(htmlBtn);

    var html = "";
    html += "<div id='sxDiv' style='position:fixed;z-index:2147483646;top:0px;right:0px;background-color:#fff;min-width:400px;width:20%;height:100%;border-radius:5px;display:none;border-left:1px solid silver;'>";
    //broker info
    html += '<div id="brokerInfoDiv" class="sxinfo" style="background-image:none;">';
    html += '<div class="info-general">';
    html += '<img id="broker-logo" class="general-icon" src="'+brokerLogo+'" height="60px" style="margin:10px auto;"/>';
    html += '</div>';
    html += '<div class="info-detail" style="text-align:left">';
    html += '<div id="broker-name" class="info-text info-blank" style="color:#000;font-weight:bold;font-size:14px;">'+brokerName+'</div>';
    html += '<div class="info-text info-blank" id="brokerHint"  style="color:#000">确幸智能助手</div>';
    html += '</div>';
    html += '</div>';
    //search result
    html += '<div id="sxListDiv" class="list">';
    html += '<iframe id="sxListFrame" src="'+loginUrl+'" width="100%" height="400px" frameborder="0" sandbox="allow-scripts allow-same-origin">';
    html += '</div>';
    html += "</div>";
    jNode.append(html);

    //读取面板显示状态：通过postMessage向iframe请求cookie得到
    if(_sxdebug)console.log("post message to get sxToolbarStatus ");
    document.getElementById('sxListFrame').contentWindow.postMessage({
      action:"checkToolbarStatus",
    }, "*");//向父窗口发出消息，查询sxAuth

    //调整iframe高度
    var iframeHeight = $('#sxDiv').height()-$('#brokerInfoDiv').height();
    $("#sxListFrame").height(iframeHeight);

    //检查本地toolbar显示状态
    try{
        var toolbarStatus = JSON.parse(localStorage.getItem("sxToolbarStatus"));
        showToolbar(toolbarStatus);
    }catch(err){}

    //隐藏事件
    $("#sxHideBtnDiv").click(function(event){
        $("#sxHideBtnDiv").css("display","none");
        $("#sxShowBtnDiv").css("display","block");
        $("#sxDiv").css("display","none");

        //存入本地
        localStorage.setItem("sxToolbarStatus", JSON.stringify({show: false}));

        //存入缓存，能够在多个界面中保持一致
        /**
        var data = {
            action:"setToolbarStatus",
            data:{show:false}
        };
        if(_sxdebug)console.log("try to post sxToolbar status message to iframe.",data);
        document.getElementById('sxListFrame').contentWindow.postMessage(data, '*');
        //**/
    });
    $("#sxShowBtnDiv").click(function(event){
        $("#sxShowBtnDiv").css("display","none");
        $("#sxHideBtnDiv").css("display","block");
        $("#sxDiv").css("display","block");

        //存入本地
        localStorage.setItem("sxToolbarStatus", JSON.stringify({show: true}));

        //存入缓存，能够在多个界面中保持一致
        /**
        var data = {
            action:"setToolbarStatus",
            data:{show:true}
        };
        if(_sxdebug)console.log("try to post sxToolbar status message to iframe.",data);
        document.getElementById('sxListFrame').contentWindow.postMessage(data, '*');
        //**/
    });
}

//显示或隐藏toolbar
function showToolbar( toolbarStatus ){
    if (!toolbarStatus) return;
    if(toolbarStatus.show) { //显示则默认打开
        $("#sxShowBtnDiv").css("display","none");
        $("#sxHideBtnDiv").css("display","block");
        $("#sxDiv").css("display","block");
    }else { //否则隐藏
        $("#sxShowBtnDiv").css("display","block");
        $("#sxHideBtnDiv").css("display","none");
        $("#sxDiv").css("display","none");
    }
}

//根据sxToolbarStatus更新界面显示
function updateToolbarInfo( userInfo ){
    if(!userInfo) return;
    console.log("update toolbar with userInfo.", userInfo);
    var nbrokerName = "Hi,"+(userInfo.username?userInfo.username:"")+(userInfo.sxBrokerOrgnization&&userInfo.sxBrokerOrgnization.trim().length>0?("("+userInfo.sxBrokerOrgnization+")"):"");
    //brokerName += "&nbsp;<a href='#' style='font-size:12px;color:silver' id='sxChangeBroker' alt='切换账户'><img width='12' text='切换账户' style='vertical-align:middle; margin: 0 auto; ' src='https://www.biglistoflittlethings.com/ilife-web-wx/images/change.png'/></a>";
    nbrokerName += "&nbsp;<a href='#' style='font-size:12px;color:silver;text-decoration:none' id='sxChangeBroker' alt='切换账户'><span style='width:12px;height:12px;'>⇌</span></a>";
    $("#broker-name").html(nbrokerName);
    if(userInfo.avatar)$("#broker-logo").attr("src",userInfo.avatar);
    $("#sxChangeBroker").click(function(event){ //退出
        //删除sxCookie
        if(_sxdebug)console.log("try to remove broker info.");
        document.getElementById('sxListFrame').contentWindow.postMessage({
            action:"logout",
        }, "*");
        //修改登录信息
        $("#broker-name").html(brokerName);
        $("#broker-logo").attr("src",brokerLogo);
        //停止轮询
        clearInterval(timer);
        //修改iframe页面
        $("#sxListFrame").attr("src",loginUrl);
    });

}

function listenPostMessage(){
    var eventMethod = window.addEventListener ? "addEventListener" : "attachEvent";
    var eventer = window[eventMethod];
    var messageEvent = eventMethod == "attachEvent" ? "onmessage" : "message";

    // Listen to message from child window
    eventer(messageEvent,function(e) {
        var key = e.message ? "message" : "data";
        var data = e[key];
        if(_sxdebug)console.log("got message from child window.",data);

        //发送消息到会话框
        if(data && data.action == "sxSendMsg" && data.content && data.content.trim().length>0 ){
            console.log("action: send msg",data.content);
            $("div.simulate-textarea").text(data.content);
            //TODO: 点击发送按钮
            console.log("got btn.",$(".chat_area-button button[title='发送消息']"));
            //$(".chat_area-button button[title='发送消息']").click();
        }

        //接收login信息
        if(data && data.action == "sxLogin" && data.data ){
            console.log("action: change toolbar status",data.data);
            //保存，后续可直接引用
            if(data.data.userInfo){
                localStorage.setItem("sxUserInfo", data.data.userInfo);
                //修改界面显示
                updateToolbarInfo(data.data.userInfo);
                //页面跳转
                $("#sxListFrame").attr("src",loginUrl);
            }
        }

        //接收toolbar状态，包括工具条状态及登录信息
        if(data && data.action == "sxToolbarStatus" && data.data ){
            console.log("action: change toolbar status",data.data);
            //保存，后续可直接引用
            //显示状态存储于本地，不通过服务器端处理
            /*
            if(data.data.toolbarStatus){
                localStorage.setItem("sxToolbarStatus", data.data.toolbarStatus);
                showToolbar(data.data.toolbarStatus); //显示或隐藏
            }
            //**/
            if(data.data.userInfo){
                localStorage.setItem("sxUserInfo", data.data.userInfo);
                //修改界面显示
                updateToolbarInfo(data.data.userInfo);
            }
        }

        //在新标签页中打开url
        if(data && data.action == "sxRediret" && data.url && data.url.trim().length>0 ){
            console.log("action: redirect",data.url);
            window.open(data.url);
        }

        //接收客户SOP设置，并开始轮询消息
        if(data && data.action == "sxSopCustomer" && data.sop ){
            console.log("action: sxSopCustomer",data.sop);
            //开始轮询客户消息列表，并启动定时器
            timeoutAutoReply = data.sop.threshold?data.sop.threshold:180;
            timeoutNotify = timeoutAutoReply-180>0?timeoutAutoReply-180:timeoutAutoReply/2; //默认预留3分钟用于通知后处理，否则用超时时长一半
            loopCustomerMsgs();
        }

    },false);
}

var timerInterval = 300; //轮询间隔
var timeoutNotify= 120; //提醒超时默认为2分钟
var timeoutAutoReply= 180; //自动回复超时默认为2分钟
var sxTimers = new Array(); //定时器列表
var companyName = "四川和邦国际旅行社有限责任公司万和路分公司"; //TODO：需要根据用户设置读取
var testSent = false;
var timer = null;
function loopCustomerMsgs( ){
    var currentTimestamp = new Date().getTime();
    timer = setInterval( function () {
            //console.log("check customer msg ...");
            $(".im_friend-queue li>a").each(function(){ //获取所有消息列表
                var msg = {
                    channelName: "vBooking",//根据当前站点设置
                    channelType: "ota",
                    contentType: "text", 
                    toUser: $(this).find("strong.nick").text(),
                    fromUser: $(this).find("em.message-name").text(),
                    msg: $(this).find("em.newmessage").text(),
                    time:$(this).find("span.date").text(),
                    startTimeout: currentTimestamp, //开始计时时间戳
                    notifyTimeout: currentTimestamp + timeoutNotify * 1000, //提醒超时
                    autoReplyTimeout: currentTimestamp + timeoutAutoReply * 1000, //自动回复超时
                }
                //console.log("check msg",msg);

                //仅用于测试
                if(!testSent){
                    document.getElementById('sxListFrame').contentWindow.postMessage({
                        action:"sendAutoReply",
                        data:msg
                    }, "*");//向子窗口发出消息 
                    testSent = true;
                }

                //查询是否已经在列表，并检查时间
                var idx = sxTimers.findIndex( item => item.toUser == msg.toUser);
                if( idx >= 0 ){ //检查是否超时并处理
                    var timer = sxTimers[idx];
                    if(timer.notifyTimeout && timer.notifyTimeout >= currentTimestamp - timerInterval ){ //该发送通知了
                        console.log("msg timeout notify.", timer);
                        //发送通知
                        document.getElementById('sxListFrame').contentWindow.postMessage({
                            action:"sendNotify",
                            data:msg
                        }, "*");//向子窗口发出消息
                        timer.notifyTimeout = null;
                        sxTimers.splice(idx,1,timer);
                    }else if(timer.autoReplyTimeout && timer.autoReplyTimeout >= currentTimestamp - timerInterval ){ //该自动回复了
                        console.log("msg timeout autoreply.", timer);
                        //TODO：自动回复： 注意，需要切换到相应用户，后者直接通过API调用完成
                        $("div.simulate-textarea").text("auto reply test");
                        //并发送通知
                        document.getElementById('sxListFrame').contentWindow.postMessage({
                            action:"sendAutoReply",
                            data:msg
                        }, "*");//向子窗口发出消息                        
                        timer.notifyTimeout = null;
                        timer.autoReplyTimeout = null;
                        sxTimers.splice(idx,1,timer);
                    }else{ //继续等待
                        console.log("timer countinue.", timer);
                    }
                }else if( msg.fromUser != companyName ){ //表示是客人发的消息，需要加入timer列表
                    sxTimers.push(msg);//加入定时器
                }else{ //认为是已经回复的消息，需要清除定时器
                    console.log("clear timer", msg)
                    sxTimers.splice(idx,1);
                }
            });
        }, timerInterval);
}

