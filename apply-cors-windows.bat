@echo off
echo ====================================
echo Aplicando CORS no Firebase Storage
echo ====================================
echo.
echo IMPORTANTE: Voce precisa ter o gcloud CLI instalado
echo Download: https://cloud.google.com/sdk/docs/install
echo.
echo Depois de instalar, execute:
echo 1. gcloud auth login
echo 2. gcloud config set project locai-76dcf
echo 3. gsutil cors set cors.json gs://locai-76dcf.appspot.com
echo.
echo Alternativamente, voce pode fazer isso manualmente:
echo.
echo 1. Acesse: https://console.cloud.google.com/storage/browser
echo 2. Selecione o bucket: locai-76dcf.appspot.com
echo 3. Va em "Configuracao" (Settings)
echo 4. Clique em "Editar configuracao CORS"
echo 5. Cole o conteudo do arquivo cors.json
echo.
pause