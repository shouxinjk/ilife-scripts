<?php

/**
*jd access token
*/

$response_type = "code";
$grant_type = "authorization_code";
$client_id = "a8b8f5e8b692f3e1dbeeca511075708f";
$client_secret = "d99bed87ba4f4a5c8299dce161ffbb2d";
$redirect_uri = "http://www.shouxinjk.net/oauth/jd.php";
$state = "jdunion";
$codeurl = 'https://oauth.jd.com/oauth/authorize';
$tokenurl = "https://oauth.jd.com/oauth/token?";

$code = $_GET["code"];

if ($code != "")
{
  $fields = [
      "grant_type" => urlencode($grant_type),
      "client_id" => urlencode($client_id),
      "redirect_uri" => urlencode($redirect_uri),
      "code" => urlencode($code),
      "state" => urlencode($state),
      "client_secret" => urlencode($client_secret)
  ];

  $fields_string = "";
  foreach($fields as $key=>$value) {
     $fields_string .= $key.'='.$value.'&';
  }
  rtrim($fields_string, '&');

  $ch = curl_init();
  curl_setopt($ch, CURLOPT_URL, $tokenurl.$fields_string);
  curl_setopt($ch, CURLOPT_RETURNTRANSFER, 1);
  $result = curl_exec($ch);
  curl_close($ch);

  echo "Response：<br />".mb_convert_encoding($result,"UTF-8","GBK");

}
else
{
  header("Location: ".$codeurl."?response_type=".$response_type."&client_id=".$client_id."&redirect_uri=".$redirect_uri."&state=".$state);
}

?>
