
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
var brokerName = "设置回复内容";
var brokerLogo = "https://biglistoflittlethings.com/ilife-web-wx/images/icon.jpeg";
var loginUrl = "https://air.biglistoflittlethings.com/login?origin=helper"; //默认登录地址
function sxInitialize(jNode){

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
    htmlBtn += '<div class="info-text info-blank" style="color:#000;font-size:14px;height:100px;background-color:#fff">自<br/>动<br/>应<br/>答</div>';
    htmlBtn += '</div>';

    jNode.append(htmlBtn);

    var html = "";
    html += "<div id='sxDiv' style='position:fixed;z-index:2147483646;top:0px;right:0px;background-color:#fff;min-width:400px;width:20%;height:100%;border-radius:5px;display:none;border-left:1px solid silver;'>";
    //broker info
    html += '<div id="brokerInfoDiv" class="sxinfo" style="background-image:none;border-bottom:1px solid silver;height:108px;">';
    html += '<div class="info-general">';
    html += '<img id="broker-logo" class="general-icon" src="'+brokerLogo+'" height="60px" style="margin:10px auto;"/>';
    html += '</div>';
    html += '<div class="info-detail" style="text-align:left">';
    //html += '<div id="broker-name" class="info-text info-blank" style="color:#ccc;font-weight:bold;font-size:12px;">'+brokerName+'</div>';
    html += '<div style="line-height:24px;">回复内容&nbsp;<input type="text" id="autoreplymsg" value="消息收到，请稍等" style="border: 1px solid silver;color:#000;line-height:18px;font-size:12px;"></div>';
    html += '<div style="line-height:24px;">超时提醒&nbsp;<input type="text" id="autoreplyTimeoutNotify" value="60" style="border: 1px solid silver;color:#000;line-height:18px;font-size:12px;">&nbsp;秒</div>';
    html += '<div style="line-height:24px;">超时回复&nbsp;<input type="text" id="autoreplyTimeoutSent" value="90" style="border: 1px solid silver;color:#000;line-height:18px;font-size:12px;">&nbsp;秒</div>';
    html += '<div style="line-height:24px;"><input type="checkbox" id="timoutActionSent"/><label for="timoutActionSent">开启自动回复</label> </div>';
    html += '</div>';
    html += '</div>';

    //提示内容
    html += `<div style="border-bottom:1px solid silver;">
                <div>仅在有新消息时显示内容，若无新消息则显示空白。显示格式如下：</div>
                <div>新收到的客户消息</div>
                <div style="color:red">客户消息已经超过提醒时间</div>
                <div style="color:red;text-decoration:line-through;">客户消息已经自动回复</div>
                <div style="color:green;text-decoration:line-through;">客户消息已经人工回复</div>
            </div>`;
    //接收到的消息列表
    html += '<div id="_pendingmsgs" style="overflow-y:scroll"></div>';
    html += "</div>";
    jNode.append(html);

    //自动回复内容设置
    if(localStorage.getItem("sxReplyMsg")){ //从本地加载设置
        replyMsg = localStorage.getItem("sxReplyMsg")
        $("#autoreplymsg").val(replyMsg);
    }
    $("#autoreplymsg").blur(function(){ //修改设置
        replyMsg = $("#autoreplymsg").val();
        console.log("change auto reply msg", replyMsg);
        //存入本地
        localStorage.setItem("sxReplyMsg", replyMsg);
    });

    //提醒时长设置
    if(localStorage.getItem("sxTimoutNotify")){ //从本地加载设置
        try{
            timeoutNotify = parseInt(localStorage.getItem("sxTimoutNotify"));
        }catch(err){
            timeoutNotify = 90; //默认为90秒
        }
        $("#autoreplyTimeoutNotify").val(timeoutNotify);
    }
    $("#autoreplyTimeoutNotify").blur(function(){ //修改设置
        try{
            timeoutNotify = parseInt($("#autoreplyTimeoutNotify").val());
        }catch(err){
            timeoutNotify = 60; //默认为60秒
        }
        console.log("change notify timeout", timeoutNotify);
        //存入本地
        localStorage.setItem("sxTimoutNotify", timeoutNotify);
    });

    //自动回复时长设置
    if(localStorage.getItem("sxTimoutReply")){ //从本地加载设置
        try{
            timeoutAutoReply = parseInt(localStorage.getItem("sxTimoutReply"));
        }catch(err){
            timeoutAutoReply = 90; //默认为90秒
        }
        $("#autoreplyTimeoutSent").val(timeoutAutoReply);
    }
    $("#autoreplyTimeoutSent").blur(function(){ //修改设置
        try{
            timeoutAutoReply = parseInt($("#autoreplyTimeoutSent").val());
        }catch(err){
            timeoutAutoReply = 90; //默认为90秒
        }
        console.log("change auto reply timeout", timeoutAutoReply);
        //存入本地
        localStorage.setItem("sxTimoutReply", timeoutAutoReply);
    });    
    
    //开启及关闭自动回复功能：默认为false，需要手动开启
    $("#timoutActionSent").change(function () {
        timoutAutoSent = $(this).is(':checked');
        console.log("auto reply setting changeed.", timoutAutoSent);
    });    

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

    });
    $("#sxShowBtnDiv").click(function(event){
        $("#sxShowBtnDiv").css("display","none");
        $("#sxHideBtnDiv").css("display","block");
        $("#sxDiv").css("display","block");

        //存入本地
        localStorage.setItem("sxToolbarStatus", JSON.stringify({show: true}));

    });

    loopCustomerMsgs();//开始监听
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


var timerInterval = 2500; //消息轮询间隔，毫秒数
var timeoutNotify= 60; //提醒回复时间，秒
var timeoutAutoReply= 90; //自动回复超时时间，秒
var timoutAutoSent = false; //是否开启自动回复：开启后自动点击发送按钮

var sxTimers = new Array(); //定时器列表
var replyMsg = "消息收到，请稍等"; //支持设置自定义回复语
var timer = null;
function loopCustomerMsgs( ){
    //设置消息框高度
    $("#_pendingmsgs").css("height",(document.body.clientHeight-200)+"px");
    timer = setInterval( function () {
            var currentTimestamp = new Date().getTime(); //重要：在每次循环时需要重新获取时间
            //console.log("check customer msg ...");
            $(".im_friend-queue li>a").each(function(){ //获取所有消息列表
                var msg = {
                    id: hex_md5($(this).find("strong.nick").text()), //认为toUser唯一
                    toUser: $(this).find("strong.nick").text(),
                    fromUser: $(this).find("em.message-name").text(), //据此判断最后发送人，如果和配置名称一致则表示已回复，直接忽略
                    msg: $(this).find("em.newmessage").text(),
                    pendingResponse: $(this).find("em.newmessage").attr("style") === "color: red;" //红色标记，
                                        && $(this).find("em.newmessage").text() !== "" 
                                        && $(this).find("em.newmessage").text().trim().length > 0  //内容不为空
                                        && $(this).find("em.newmessage").text() !== "[通知消息]", //内容不为【通知消息】
                    time:$(this).find("span.date").text(),
                    startTimeout: currentTimestamp, //开始计时时间戳
                    notifyTimeout: currentTimestamp + timeoutNotify * 1000, //提醒超时
                    autoReplyTimeout: currentTimestamp + timeoutAutoReply * 1000, //自动回复超时
                }
                //console.log("check msg",msg);
                //消息显示：当前刷新时间，最后收到消息时间，发送用户，消息内容
                var currentDate = new Date();
                var sysTimeStr = (currentDate.getMonth()+1)+"-"+currentDate.getDate() +" "+
                                currentDate.getHours()+":"+currentDate.getMinutes()+":"+currentDate.getSeconds();
                
                //获取提醒秒数剩余
                var remainingNotifyStr = "0";
                var remainingReplyStr = "0";

                //var msgTxt = "["+sysTimeStr+"] "+msg.time+" "+msg.toUser+" "+msg.msg;
                var msgTxt = "["+sysTimeStr+"] "+remainingNotifyStr+" "+remainingReplyStr+" "+msg.toUser;

                //查询是否已经在列表，并检查时间
                var idx = sxTimers.findIndex( item => item.id == msg.id);
                if( msg.pendingResponse && idx >= 0 ){ //已在队列内，检查是否超时并处理
                    var timer = sxTimers[idx];

                    //获取提醒秒数剩余
                    if(!timer.notifyTimeout){
                        remainingNotifyStr = "0";
                    }else{
                        var remainingNotify = (timer.notifyTimeout-currentTimestamp)/1000;
                        if(remainingNotify>0){
                            remainingNotifyStr = remainingNotify.toFixed(0);
                        }
                    }
                    //获取自动回复秒数剩余
                    if(!timer.autoReplyTimeout){
                        remainingReplyStr = "0";
                    }else{
                        var remainingReply = (timer.autoReplyTimeout-currentTimestamp)/1000;
                        if(remainingReply>0){
                            remainingReplyStr = remainingReply.toFixed(0);
                        }
                    }

                    //显示内容
                    msgTxt = "["+sysTimeStr+"] "+remainingNotifyStr+" "+remainingReplyStr+" "+msg.toUser;

                    if(timer.notifyTimeout && timer.notifyTimeout <= currentTimestamp /*- timerInterval */){ //该发送通知了
                        console.log("timeout notify.", timer.toUser);
                        //红色高亮显示：临近超时
                        $("#"+msg.id).text(msgTxt); //更新消息显示
                        $("#"+msg.id).css({"color": "red"});
                        timer.notifyTimeout = null;
                        //sxTimers.splice(idx,1,timer); //提醒不改变消息的最后收到时间
                    }else if(timer.autoReplyTimeout && timer.autoReplyTimeout <= currentTimestamp /*- timerInterval*/ ){ //该自动回复了
                        console.log("timeout autoreply.", timer.toUser);
                        //以下为回复消息：选中对话、设置回复内容、点击发送按钮

                        //选中聊天对话框
                        $("strong:contains('"+msg.toUser+"')").click();

                        //重要：直接设置消息
                        if(timoutAutoSent){
                            $("div.simulate-textarea").text( replyMsg );
                        }else{
                            console.log("autoSent disabled. leave blank msg. you will get a no message toast.");
                        }
                    
                        //模拟点击操作发送消息： 在未设置自动回复时页面会提示
                        $("button[title='发送消息']").click();

                        //清除记录
                        $("#"+msg.id).text(msgTxt); //更新消息显示
                        $("#"+msg.id).css({"text-decoration": "line-through"});                  
                        timer.notifyTimeout = null;
                        timer.autoReplyTimeout = null;
                        //sxTimers.splice(idx,1,timer); //回复后自动从列表中清除
                        sxTimers.splice(idx,1);
                        //一个轮询内仅回复一次，避免面多个同时回复出现冲突
                        return false;
                    }else{ //继续等待
                        $("#"+msg.id).text(msgTxt); //更新消息显示
                        console.log("counting down.", timer.notifyTimeout-currentTimestamp, timer.autoReplyTimeout-currentTimestamp, timer.toUser);
                    }
                }else if( msg.pendingResponse ){ //表示待回复，需要新增到队列
                    console.log("add new timer to queue", msg.toUser)
                    sxTimers.push(msg);//加入定时器
                    msgTxt = "["+sysTimeStr+"] "+timeoutNotify+" "+timeoutAutoReply+" "+msg.toUser;
                    if($("#"+msg.id).length>0){ //如果出现过，则先删除
                        $("#"+msg.id).remove();
                    }
                    $("#_pendingmsgs").prepend('<div id="'+msg.id+'">'+msgTxt+'</div>');   
                }else if( idx>=0 ){ //认为是已经人工回复的消息，清除即可
                    console.log("manual replied. clear timer", msg.toUser)
                    //$("#_pendingmsgs").append('<div id="'+msg.toUser+'">'+msgTxt+'</div>');
                    $("#"+msg.id).css({"color": "green"});
                    $("#"+msg.id).css({"text-decoration": "line-through"});
                    sxTimers.splice(idx,1);
                }else {
                    //console.log("unkonw case.", msgTxt);
                }
            });
        }, timerInterval);
}

