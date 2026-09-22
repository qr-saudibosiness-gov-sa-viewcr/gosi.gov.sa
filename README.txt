GOSI local unified certificate verification

Arabic route:
/ar/VerifyECertificate/Establishment

English route:
/en/VerifyECertificate/Establishment

Each certificate = JSON + PDF in /data.
Mapping key in data/routes.json:
"ESTABLISHMENT_NUMBER|CERTIFICATE_CODE": "FILE_ID"

Example files:
data/634392394__121098969.json
data/634392394__121098969.pdf

The Preview button reads routes.json, then JSON, and displays the result in the SAME URL.
The download button downloads the PDF named by pdfFile in the JSON.

فتح النتيجة مباشرة (اختياري):
/ar/VerifyECertificate/Establishment?stakeholderValue=634392394&certificateNumber=121098969&direct=1
/en/VerifyECertificate/Establishment?stakeholderValue=634392394&certificateNumber=121098969&direct=1

بدون direct=1 تفتح صفحة الإدخال بشكل طبيعي.

SHORT DIRECT LINKS
------------------
ربط النتيجة المباشرة المختصرة موجود في:
data/direct-routes.json

مثال:
"23": "634392394__121098969"

يفتح النتيجة مباشرة من:
/ar/VerifyECertificate/Establishment?23
/en/VerifyECertificate/Establishment?23

ومدعوم أيضًا:
/ar/VerifyECertificate/Establishment?id=23
