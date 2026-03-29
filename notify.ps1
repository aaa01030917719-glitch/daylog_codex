param([string]$message)

$token = "8755382719:AAEOqsikLEKAsL1OL82gvlIdFaSgtQuoaEI"
$chatId = "8664991864"
$url = "https://api.telegram.org/bot$token/sendMessage"

Invoke-WebRequest -Uri $url -Method POST -Body @{
    chat_id = $chatId
    text = $message
} | Out-Null