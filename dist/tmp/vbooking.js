var _sxdebug=!0,brokerName="设置回复内容",brokerLogo="https://biglistoflittlethings.com/ilife-web-wx/images/icon.jpeg",loginUrl="https://air.biglistoflittlethings.com/login?origin=helper";function sxInitialize(t){var e="";e+='<div id="sxHideBtnDiv" class="sxinfo" style="position:fixed;z-index:2147483647;top:0px;right:0px;background-color:#fff;width:50px;height:20px;border-radius:5px;display:none">',e+='<div style="line-height:22px;color:grey;background-color:#fff">隐藏</div>',e+="</div>",e+='<div id="sxShowBtnDiv" class="sxinfo" style="position:fixed;z-index:2147483647;top:0px;right:0;background-color:#fff;width:44px;height:150px;border-radius:5px;padding-left:12px;display:block">',e+='<div class="info-general">',e+='<img class="general-icon" src="'+brokerLogo+'" width="30" height="30"/>',e+="</div>",e+='<div class="info-detail" style="text-align:left">',e+='<div class="info-text info-blank" style="color:#000;font-size:14px;height:100px;background-color:#fff">自<br/>动<br/>应<br/>答</div>',e+="</div>",t.append(e);var i="";if(i+="<div id='sxDiv' style='position:fixed;z-index:2147483646;top:0px;right:0px;background-color:#fff;min-width:400px;width:20%;height:100%;border-radius:5px;display:none;border-left:1px solid silver;'>",i+='<div id="brokerInfoDiv" class="sxinfo" style="background-image:none;border-bottom:1px solid silver;height:108px;">',i+='<div class="info-general">',i+='<img id="broker-logo" class="general-icon" src="'+brokerLogo+'" height="60px" style="margin:10px auto;"/>',i+="</div>",i+='<div class="info-detail" style="text-align:left">',i+='<div style="line-height:24px;">回复内容&nbsp;<input type="text" id="autoreplymsg" value="消息收到，请稍等" style="border: 1px solid silver;color:#000;line-height:18px;font-size:12px;"></div>',i+='<div style="line-height:24px;">超时提醒&nbsp;<input type="text" id="autoreplyTimeoutNotify" value="60" style="border: 1px solid silver;color:#000;line-height:18px;font-size:12px;">&nbsp;秒</div>',i+='<div style="line-height:24px;">超时回复&nbsp;<input type="text" id="autoreplyTimeoutSent" value="90" style="border: 1px solid silver;color:#000;line-height:18px;font-size:12px;">&nbsp;秒</div>',i+='<div style="line-height:24px;"><input type="checkbox" id="timoutActionSent"/><label for="timoutActionSent">开启自动回复</label> </div>',i+="</div>",i+="</div>",i+='<div style="border-bottom:1px solid silver;">\n                <div>仅在有新消息时显示内容，若无新消息则显示空白。显示格式如下：</div>\n                <div>新收到的客户消息</div>\n                <div style="color:red">客户消息已经超过提醒时间</div>\n                <div style="color:red;text-decoration:line-through;">客户消息已经自动回复</div>\n                <div style="color:green;text-decoration:line-through;">客户消息已经人工回复</div>\n            </div>',i+='<div id="_pendingmsgs" style="overflow-y:scroll"></div>',i+="</div>",t.append(i),localStorage.getItem("sxReplyMsg")&&(replyMsg=localStorage.getItem("sxReplyMsg"),$("#autoreplymsg").val(replyMsg)),$("#autoreplymsg").blur(function(){replyMsg=$("#autoreplymsg").val(),console.log("change auto reply msg",replyMsg),localStorage.setItem("sxReplyMsg",replyMsg)}),localStorage.getItem("sxTimoutNotify")){try{timeoutNotify=parseInt(localStorage.getItem("sxTimoutNotify"))}catch(t){timeoutNotify=90}$("#autoreplyTimeoutNotify").val(timeoutNotify)}if($("#autoreplyTimeoutNotify").blur(function(){try{timeoutNotify=parseInt($("#autoreplyTimeoutNotify").val())}catch(t){timeoutNotify=60}console.log("change notify timeout",timeoutNotify),localStorage.setItem("sxTimoutNotify",timeoutNotify)}),localStorage.getItem("sxTimoutReply")){try{timeoutAutoReply=parseInt(localStorage.getItem("sxTimoutReply"))}catch(t){timeoutAutoReply=90}$("#autoreplyTimeoutSent").val(timeoutAutoReply)}$("#autoreplyTimeoutSent").blur(function(){try{timeoutAutoReply=parseInt($("#autoreplyTimeoutSent").val())}catch(t){timeoutAutoReply=90}console.log("change auto reply timeout",timeoutAutoReply),localStorage.setItem("sxTimoutReply",timeoutAutoReply)}),$("#timoutActionSent").change(function(){timoutAutoSent=$(this).is(":checked"),console.log("auto reply setting changeed.",timoutAutoSent)});try{showToolbar(JSON.parse(localStorage.getItem("sxToolbarStatus")))}catch(t){}$("#sxHideBtnDiv").click(function(t){$("#sxHideBtnDiv").css("display","none"),$("#sxShowBtnDiv").css("display","block"),$("#sxDiv").css("display","none"),localStorage.setItem("sxToolbarStatus",JSON.stringify({show:!1}))}),$("#sxShowBtnDiv").click(function(t){$("#sxShowBtnDiv").css("display","none"),$("#sxHideBtnDiv").css("display","block"),$("#sxDiv").css("display","block"),localStorage.setItem("sxToolbarStatus",JSON.stringify({show:!0}))}),loopCustomerMsgs()}function showToolbar(t){t&&(t.show?($("#sxShowBtnDiv").css("display","none"),$("#sxHideBtnDiv").css("display","block"),$("#sxDiv").css("display","block")):($("#sxShowBtnDiv").css("display","block"),$("#sxHideBtnDiv").css("display","none"),$("#sxDiv").css("display","none")))}var timerInterval=1e4,timeoutNotify=60,timeoutAutoReply=90,timoutAutoSent=!1,sxTimers=new Array,replyMsg="消息收到，请稍等",timer=null;function loopCustomerMsgs(){$("#_pendingmsgs").css("height",document.body.clientHeight-200+"px");var t=(new Date).getTime();timer=setInterval(function(){$(".im_friend-queue li>a").each(function(){var e={id:hex_md5($(this).find("strong.nick").text()),toUser:$(this).find("strong.nick").text(),fromUser:$(this).find("em.message-name").text(),msg:$(this).find("em.newmessage").text(),pendingResponse:"color: red;"===$(this).find("em.newmessage").attr("style")&&""!==$(this).find("em.newmessage").text()&&$(this).find("em.newmessage").text().trim().length>0&&"[通知消息]"!==$(this).find("em.newmessage").text(),time:$(this).find("span.date").text(),startTimeout:t,notifyTimeout:t+1e3*timeoutNotify,autoReplyTimeout:t+1e3*timeoutAutoReply},i=new Date,o="["+(i.getMonth()+1+"-"+i.getDate()+" "+i.getHours()+":"+i.getMinutes()+":"+i.getSeconds())+"] "+e.time+" "+e.toUser+" "+e.msg,s=sxTimers.findIndex(t=>t.id==e.id);if(e.pendingResponse&&s>=0){var l=sxTimers[s];l.notifyTimeout&&l.notifyTimeout>=t-timerInterval?(console.log("msg timeout notify.",l),$("#"+e.id).text(o),$("#"+e.id).css({color:"red"}),l.notifyTimeout=null):l.autoReplyTimeout&&l.autoReplyTimeout>=t-timerInterval?(console.log("msg timeout autoreply.",l),$("strong:contains("+e.toUser+")").click(),timoutAutoSent&&$("div.simulate-textarea").text(replyMsg),$("button[title='发送消息']").click(),$("#"+e.id).text(o),$("#"+e.id).css({"text-decoration":"line-through"}),l.notifyTimeout=null,l.autoReplyTimeout=null,sxTimers.splice(s,1)):console.log("timer countinue.",l)}else e.pendingResponse?0==$("#"+e.id).length&&(sxTimers.push(e),$("#_pendingmsgs").append('<div id="'+e.id+'">'+o+"</div>")):(console.log("manual replied. clear timer",e),$("#"+e.id).css({color:"green"}),$("#"+e.id).css({"text-decoration":"line-through"}),sxTimers.splice(s,1))})},timerInterval)}