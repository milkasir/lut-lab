# 兔小呆 LUT 导入与机身设置

来源：用户上传的 `兔小呆lut(1).zip`（SHA-256 `740181f557051d0228fdfdc6ec27f291974041f32fedb4e88a55923aba58a55c`）。包内有 14 个 CUBE、10 张作者介绍/设置图。

14 款均为 33³ 三维 LUT，35,937 行 RGB 数据，DOMAIN 为 0–1。文件没有 `#LUMIXPHOTOSTYLE` 标记，作者说明要求 STD 标准，且导出配置注明 sRGB；本站据此将素材基底标为 STD，原文件逐字节保留。未按文件名猜测 Log 输入，也未将推荐参数写回 CUBE。

以下是机身额外设置，网页预览不会自动模拟颗粒、清晰度、降噪、智能动态范围、镜头或柔光镜。实际机身请按照作者 STD 照片格调设置使用。完整简介可在 LUT 详情查看，并可在管理页修改（每条不超过 200 字符）。

同一项的斜线表示作者给出的备选值；含糊的原文单独保留，不推测符号或曝光步长。

## keda 400 Yang TXD VOL2

- 原文件：`VOL2 keda 400 Yang .cube`
- 来源目录：`VOL.2 TXD kade 400/cube/VOL2 keda 400 Yang .cube`
- 原始校验：`1c3ee237cc2b21977e58e418bad742402a2e6e71638a1ab4de96e860b7a9ca4a`
- 设置依据：`VOL.2 TXD kade 400/cube/机内设置.jpg`
- 分类：胶片风格；输入：STD（原始标记未声明）

KEDA 400 创作配色，保留 Yang 独立分支；随包未单独解释分支名称。

KEDA 400 创作配色，Yang 独立分支。机身参考：STD；对比+0.5，高光-0.5，阴影+1，饱和/色相0，清晰度+0.5，降噪0，LUT开启。参数图未分别标注分支。

```json
{
  "photoStyle": "STD",
  "hue": 0,
  "grain": "OFF",
  "colorGrain": "OFF",
  "contrast": 0.5,
  "highlights": -0.5,
  "shadows": 1,
  "saturation": 0,
  "sharpness": 0.5,
  "noiseReduction": 0,
  "lut": "ON"
}
```

截图标题为 KEDA 400+，未分别标出 Yang/Gai；两款共用该图作为参考，不推断分支差异。 机身参数为作者推荐，未做实机复现验证；网页只应用 CUBE 颜色数据，不自动应用机身颗粒、清晰度、降噪或动态范围设置。

## keda 400 Gai TXD VOL2

- 原文件：`VOL2 keda 400 Gai.cube`
- 来源目录：`VOL.2 TXD kade 400/cube/VOL2 keda 400 Gai.cube`
- 原始校验：`2740f4c5975de54001ab44d7241442ebef6157daa6b5fc8ae0a62ae52352adaf`
- 设置依据：`VOL.2 TXD kade 400/cube/机内设置.jpg`
- 分类：胶片风格；输入：STD（原始标记未声明）

KEDA 400 创作配色，保留 Gai 独立分支；随包未单独解释分支名称。

KEDA 400 创作配色，Gai 独立分支。机身参考：STD；对比+0.5，高光-0.5，阴影+1，饱和/色相0，清晰度+0.5，降噪0，LUT开启。参数图未分别标注分支。

```json
{
  "photoStyle": "STD",
  "hue": 0,
  "grain": "OFF",
  "colorGrain": "OFF",
  "contrast": 0.5,
  "highlights": -0.5,
  "shadows": 1,
  "saturation": 0,
  "sharpness": 0.5,
  "noiseReduction": 0,
  "lut": "ON"
}
```

截图标题为 KEDA 400+，未分别标出 Yang/Gai；两款共用该图作为参考，不推断分支差异。 机身参数为作者推荐，未做实机复现验证；网页只应用 CUBE 颜色数据，不自动应用机身颗粒、清晰度、降噪或动态范围设置。

## Kodak 5203 V5 TXD VOL7

- 原文件：`VOL7 TXD Kodak 5203 V5.cube`
- 来源目录：`VOL.7 TXD 柯达5203/cube/VOL7 TXD Kodak 5203 V5.cube`
- 原始校验：`a0dec5ea84cfa41e6fdef02decec0d421fad23d9dfd1ef798a7b9060b98d9012`
- 设置依据：`VOL.7 TXD 柯达5203/cube/VOL.7使用技巧.jpg`
- 分类：胶片风格；输入：STD（原始标记未声明）

作者描述为奶油色、低对比、低饱和且偏明亮温暖的电影卷风格，适合日光街拍和人像。

暖调、低对比低饱和的5203电影卷取向，适合日光街拍/人像。机身：STD自定义LUT；原厂镜头可在原设置上再降饱和0.5。优先小光比，白平衡/曝光随环境调节；原文“3格”未注明EV，未附具体参数截图。

```json
{
  "photoStyle": "STD",
  "hue": 0,
  "grain": "OFF",
  "colorGrain": "OFF",
  "saturationAdjustmentForNativeLens": "在作者原设置基础上再减0.5",
  "installation": "导入自定义 LUT，按作者说明不要使用实时 LUT 模式",
  "exposureCompensation": "白天保护高光、必要时降低曝光，夜间按环境增加；原文写3格但未给出步长"
}
```

使用技巧文字提及另有机内参数截图，但本 ZIP 未包含该截图；未补写对比、高光、阴影等数值。V5 的单独变更说明未附。 机身参数为作者推荐，未做实机复现验证；网页只应用 CUBE 颜色数据，不自动应用机身颗粒、清晰度、降噪或动态范围设置。

## QC M V2A TXD VOL10

- 原文件：`VOL10 QC M  V2A.cube`
- 来源目录：`VOL.10 TXD 青-橙 PRO/cube/VOL10 QC M  V2A.cube`
- 原始校验：`be85d9fd21aac71ca99e70f4dd514155be7a925b8110b73df5ce112532a85969`
- 设置依据：`VOL.10 TXD 青-橙 PRO/cube/机内参数.jpg`
- 分类：创作与其他；输入：STD（原始标记未声明）

青橙电影色调，反差强、暗部下沉，红黄偏橙，蓝色转青，适合街拍。

高反差青橙电影感，暗部较沉，适合扫街。机身：STD；对比+1，高光-0.5，阴影-1/-1.5，饱和-0.5/-1，色相0，清晰度+1，降噪0；颗粒/彩色颗粒关。

```json
{
  "photoStyle": "STD",
  "hue": 0,
  "grain": "OFF",
  "colorGrain": "OFF",
  "contrast": 1,
  "highlights": -0.5,
  "shadows": [
    -1,
    -1.5
  ],
  "saturation": [
    -0.5,
    -1
  ],
  "sharpness": 1,
  "noiseReduction": 0
}
```

图片按 M/P/F 介绍；M、P 文件名中的 V2A 未附单独变更说明。 机身参数为作者推荐，未做实机复现验证；网页只应用 CUBE 颜色数据，不自动应用机身颗粒、清晰度、降噪或动态范围设置。

## QC P V2A TXD VOL10

- 原文件：`VOL10 QC P  V2A.cube`
- 来源目录：`VOL.10 TXD 青-橙 PRO/cube/VOL10 QC P  V2A.cube`
- 原始校验：`c8b03680c3e64d56dcdd7c51868db49009619da1838e197e07538c7d3e921158`
- 设置依据：`VOL.10 TXD 青-橙 PRO/cube/机内参数.jpg`
- 分类：创作与其他；输入：STD（原始标记未声明）

基于 M 的较明亮人像版，优化肤色，保留较自然的黄绿，蓝色更明亮。

较明亮的青橙人像版，肤色与绿黄更自然。机身：STD；对比-0.5，高光-1，阴影原文“-0.5&1”，饱和-0.5/-1，色相0，清晰度0，降噪+1；颗粒/彩色颗粒关。

```json
{
  "photoStyle": "STD",
  "hue": 0,
  "grain": "OFF",
  "colorGrain": "OFF",
  "contrast": -0.5,
  "highlights": -1,
  "shadowsRaw": "-0.5&1",
  "saturation": [
    -0.5,
    -1
  ],
  "sharpness": 0,
  "noiseReduction": 1
}
```

阴影原文为“-0.5&1”，第二项未标正负号；原样记录，不擅自改为 -1。V2A 未附单独变更说明。 机身参数为作者推荐，未做实机复现验证；网页只应用 CUBE 颜色数据，不自动应用机身颗粒、清晰度、降噪或动态范围设置。

## QC F TXD VOL10

- 原文件：`VOL10 QC F.cube`
- 来源目录：`VOL.10 TXD 青-橙 PRO/cube/VOL10 QC F.cube`
- 原始校验：`847d59dcb90f909f790afe63abd73be0f12fc0ad3416a4947157d4c3feb389ba`
- 设置依据：`VOL.10 TXD 青-橙 PRO/cube/机内参数.jpg`
- 分类：创作与其他；输入：STD（原始标记未声明）

作者描述为仿适马 fp L 机内调色的油润青橙，反差较低、高光暗部较平，红色较纯、蓝色低调。

仿适马fp L的油润青橙，低对比、暗红与低调蓝色。机身：STD；对比0，高光-0.5，阴影原文“-0.5&1”，饱和-0.5/-1，色相0，清晰度-1，降噪0；颗粒/彩色颗粒关。

```json
{
  "photoStyle": "STD",
  "hue": 0,
  "grain": "OFF",
  "colorGrain": "OFF",
  "contrast": 0,
  "highlights": -0.5,
  "shadowsRaw": "-0.5&1",
  "saturation": [
    -0.5,
    -1
  ],
  "sharpness": -1,
  "noiseReduction": 0
}
```

阴影原文为“-0.5&1”，第二项未标正负号；原样记录，不擅自改为 -1。适马 fp L 是作者描述的配色取向，不代表适马官方 LUT。 机身参数为作者推荐，未做实机复现验证；网页只应用 CUBE 颜色数据，不自动应用机身颗粒、清晰度、降噪或动态范围设置。

## FUJI NC TXD VOL12

- 原文件：`VOL12 TXD FUJI NC.cube`
- 来源目录：`VOL.12 TXD 富士NC/CUBE文件/VOL12 TXD FUJI NC.cube`
- 原始校验：`ca647e8a60744ba34c67c1fa5f33867e9f6246019b37956db753f51cb6aaf86f`
- 设置依据：`VOL.12 TXD 富士NC/CUBE文件/加强版介绍.jpg`
- 分类：富士风格；输入：STD（原始标记未声明）

经典负片仿色的加强版，提升对比与饱和，红绿较浓郁，适合有光影的场景；逆光注意增加曝光。

浓郁经典负片加强版，适合红绿场景与明显光影，逆光可加曝光。机身：STD；对比+1，高光+0.5，阴影-0.5，饱和+1，色相0，清晰度-1，降噪0；颗粒/彩色颗粒关。

```json
{
  "photoStyle": "STD",
  "hue": 0,
  "grain": "OFF",
  "colorGrain": "OFF",
  "contrast": 1,
  "highlights": 0.5,
  "shadows": -0.5,
  "saturation": 1,
  "sharpness": -1,
  "noiseReduction": 0
}
```

机身参数为作者推荐，未做实机复现验证；网页只应用 CUBE 颜色数据，不自动应用机身颗粒、清晰度、降噪或动态范围设置。

## FUJI NC P TXD VOL12

- 原文件：`VOL12 TXD FUJI NC P.cube`
- 来源目录：`VOL.12 TXD 富士NC/CUBE文件/VOL12 TXD FUJI NC P.cube`
- 原始校验：`5f277cd462cf51bed9598bcbcf68b6e6c302eaefd9ba6417ab6d363f1bdd1efd`
- 设置依据：`VOL.12 TXD 富士NC/CUBE文件/P版介绍.jpg`
- 分类：富士风格；输入：STD（原始标记未声明）

加强版基础上减小反差、提亮画面和暗部，调整橙色与绿色使肤色、绿色更温和，适合人像。

经典负片人像版，减反差、提亮暗部并优化肤色。机身：STD；对比原文“+0.5-1”，高光+0.5，阴影0，饱和+0.5，色相0，清晰度-1.5，降噪0；颗粒/彩色颗粒关。

```json
{
  "photoStyle": "STD",
  "hue": 0,
  "grain": "OFF",
  "colorGrain": "OFF",
  "contrastRaw": "+0.5-1",
  "highlights": 0.5,
  "shadows": 0,
  "saturation": 0.5,
  "sharpness": -1.5,
  "noiseReduction": 0
}
```

对比度原图写“+0.5-1”，保留原文，未改写成已确认的两个备选值或范围。 机身参数为作者推荐，未做实机复现验证；网页只应用 CUBE 颜色数据，不自动应用机身颗粒、清晰度、降噪或动态范围设置。

## KD5207 C1 TXD VOL13

- 原文件：`VOL13 TXD KD5207 C1.cube`
- 来源目录：`VOL.13 TXD 柯达5207/CUBE/VOL13 TXD KD5207 C1.cube`
- 原始校验：`384f854abed026ef79e0e4153fa78f30ea0faf6bf799d3e68834112489453ee3`
- 设置依据：`VOL.13 TXD 柯达5207/CUBE/C和W版本推荐参数.jpg`
- 分类：胶片风格；输入：STD（原始标记未声明）

与 W 共用机身参数，肤色偏奶油黄；C 配色更冷一些，适合户外街拍和人像。

5207冷调版，适合户外街拍/人像。机身：STD；对比+0.5，高光-1/-1.5，阴影0/+1，饱和+1，色相0，清晰度-2，降噪0；颗粒/彩色颗粒关（街拍可开颗粒）。人像曝光+1/3EV，风景街拍0。

```json
{
  "photoStyle": "STD",
  "hue": 0,
  "grain": "OFF，街拍可开",
  "colorGrain": "OFF",
  "exposureCompensation": {
    "portrait": "+1/3 EV",
    "landscapeStreet": "0 EV"
  },
  "contrast": 0.5,
  "highlights": [
    -1,
    -1.5
  ],
  "shadows": [
    0,
    1
  ],
  "saturation": 1,
  "sharpness": -2,
  "noiseReduction": 0
}
```

机身参数为作者推荐，未做实机复现验证；网页只应用 CUBE 颜色数据，不自动应用机身颗粒、清晰度、降噪或动态范围设置。

## KD5207 W1 TXD VOL13

- 原文件：`VOL13 TXD KD5207 W1.cube`
- 来源目录：`VOL.13 TXD 柯达5207/CUBE/VOL13 TXD KD5207 W1.cube`
- 原始校验：`9cba4bb0c3bb0ab8973d08e1159a80b5adde66c6f5176346bf03a91a0bd8a270`
- 设置依据：`VOL.13 TXD 柯达5207/CUBE/C和W版本推荐参数.jpg`
- 分类：胶片风格；输入：STD（原始标记未声明）

与 C 共用机身参数，肤色偏奶油黄；W 高光增加洋红，适合街拍和人像。

高光带洋红的5207分支，适合街拍/人像。机身：STD；对比+0.5，高光-1/-1.5，阴影0/+1，饱和+1，色相0，清晰度-2，降噪0；颗粒/彩色颗粒关（街拍可开颗粒）。人像曝光+1/3EV，风景街拍0。

```json
{
  "photoStyle": "STD",
  "hue": 0,
  "grain": "OFF，街拍可开",
  "colorGrain": "OFF",
  "exposureCompensation": {
    "portrait": "+1/3 EV",
    "landscapeStreet": "0 EV"
  },
  "contrast": 0.5,
  "highlights": [
    -1,
    -1.5
  ],
  "shadows": [
    0,
    1
  ],
  "saturation": 1,
  "sharpness": -2,
  "noiseReduction": 0
}
```

机身参数为作者推荐，未做实机复现验证；网页只应用 CUBE 颜色数据，不自动应用机身颗粒、清晰度、降噪或动态范围设置。

## KD5207 G1 TXD VOL13

- 原文件：`VOL13 TXD KD5207 G1.cube`
- 来源目录：`VOL.13 TXD 柯达5207/CUBE/VOL13 TXD KD5207 G1.cube`
- 原始校验：`a83728d0436bf410e895697427720f58a1e40d2c4fb878735ea4802005a4ead3`
- 设置依据：`VOL.13 TXD 柯达5207/CUBE/G版本推荐参数.jpg`
- 分类：胶片风格；输入：STD（原始标记未声明）

奶油黄绿色较重，绿黄更浓、红偏橙、蓝偏青，反差较强，针对肤色做过调整。

奶油黄绿5207，绿黄较浓、红偏橙、蓝偏青。机身：STD；对比0，高光-1，阴影0/+1，饱和0/-1，色相0，清晰度-2，降噪0；颗粒/彩色颗粒关（街拍可开颗粒）。人像曝光+1/3EV，风景街拍0。

```json
{
  "photoStyle": "STD",
  "hue": 0,
  "grain": "OFF，街拍可开",
  "colorGrain": "OFF",
  "exposureCompensation": {
    "portrait": "+1/3 EV",
    "landscapeStreet": "0 EV"
  },
  "contrast": 0,
  "highlights": -1,
  "shadows": [
    0,
    1
  ],
  "saturation": [
    0,
    -1
  ],
  "sharpness": -2,
  "noiseReduction": 0
}
```

机身参数为作者推荐，未做实机复现验证；网页只应用 CUBE 颜色数据，不自动应用机身颗粒、清晰度、降噪或动态范围设置。

## GR3 Neg B TXD VOL16

- 原文件：`VOL16 TXD GR3 Neg B.cube`
- 来源目录：`VOL.16 TXD GR3负片模拟/cube/VOL16 TXD GR3 Neg B.cube`
- 原始校验：`2c1de95b80f24ff8a946ab46addf3eba692325ca3d21b7e9ece87a7ec6ca8af8`
- 设置依据：`VOL.16 TXD GR3负片模拟/vol.16 B版本介绍.jpg`
- 分类：理光风格；输入：STD（原始标记未声明）

低饱和、低反差的 GR III 负片仿色基础版，作者鼓励通过机内参数和白平衡偏移继续创作，不声称实测复刻精度。

GR III负片的低饱和低反差基础版，可自行调节影调和白平衡。机身：STD；对比/高光/阴影/饱和/色相/清晰度/降噪均0，智能动态范围AUTO；颗粒/彩色颗粒关（街拍可开颗粒）。人像曝光+1/3EV，风景街拍0。

```json
{
  "photoStyle": "STD",
  "hue": 0,
  "grain": "OFF，街拍可开",
  "colorGrain": "OFF",
  "exposureCompensation": {
    "portrait": "+1/3 EV",
    "landscapeStreet": "0 EV"
  },
  "contrast": 0,
  "highlights": 0,
  "shadows": 0,
  "saturation": 0,
  "sharpness": 0,
  "noiseReduction": 0,
  "intelligentDynamicRange": "AUTO"
}
```

机身参数为作者推荐，未做实机复现验证；网页只应用 CUBE 颜色数据，不自动应用机身颗粒、清晰度、降噪或动态范围设置。

## GR3 Neg G TXD VOL16

- 原文件：`VOL16 TXD GR3 Neg G.cube`
- 来源目录：`VOL.16 TXD GR3负片模拟/cube/VOL16 TXD GR3 Neg G.cube`
- 原始校验：`2077533ad0a2af46d80623b4b5ed2c512ae53567d9faf364b57577ccac6897ad`
- 设置依据：`VOL.16 TXD GR3负片模拟/vol.16 G版本介绍.jpg`
- 分类：理光风格；输入：STD（原始标记未声明）

相对 B 调整亮度、对比和饱和并优化肤色，适合晴天、阴天人像；作者建议搭配 1/4 黑柔或白柔并降低机内清晰度。

GR III负片人像版，提亮并优化肤色，可搭1/4黑柔或白柔。机身：STD；对比0/+0.5，高光0，阴影+1/+1.5，饱和-0.5/-1，色相0，清晰度-2.5/-3，降噪0，智能动态AUTO；颗粒/彩色颗粒关（街拍可开颗粒）。人像曝光+1/3EV，风景街拍0。

```json
{
  "photoStyle": "STD",
  "hue": 0,
  "grain": "OFF，街拍可开",
  "colorGrain": "OFF",
  "exposureCompensation": {
    "portrait": "+1/3 EV",
    "landscapeStreet": "0 EV"
  },
  "contrast": [
    0,
    0.5
  ],
  "highlights": 0,
  "shadows": [
    1,
    1.5
  ],
  "saturation": [
    -0.5,
    -1
  ],
  "sharpness": [
    -2.5,
    -3
  ],
  "noiseReduction": 0,
  "intelligentDynamicRange": "AUTO",
  "diffusionFilter": "1/4 黑柔或白柔"
}
```

机身参数为作者推荐，未做实机复现验证；网页只应用 CUBE 颜色数据，不自动应用机身颗粒、清晰度、降噪或动态范围设置。

## GR3 Neg H TXD VOL16

- 原文件：`VOL16 TXD GR3 Neg H.cube`
- 来源目录：`VOL.16 TXD GR3负片模拟/cube/VOL16 TXD GR3 Neg H.cube`
- 原始校验：`a72f66799426535c73fc40868348d7278ceb25f3a7cea37a1a60dc0fe020a388`
- 设置依据：`VOL.16 TXD GR3负片模拟/vol.16 H版本介绍.jpg`
- 分类：理光风格；输入：STD（原始标记未声明）

作者自定义 GR III 负片参数的仿色，比 B、G 更明亮且反差更强，突出红色，适合晴天街拍；人像需要充足光线，可搭配 1/4 柔光镜。

GR III负片街拍版，明亮高反差、突出红色，适合晴天；可搭1/4柔光镜。机身：STD；对比+0.5/+1，高光0，阴影-1/-1.5，饱和+1/+1.5，色相0，清晰度-2.5/-3，降噪0，智能动态AUTO；颗粒/彩色颗粒关（街拍可开颗粒）。人像曝光+1/3EV，风景街拍0。

```json
{
  "photoStyle": "STD",
  "hue": 0,
  "grain": "OFF，街拍可开",
  "colorGrain": "OFF",
  "exposureCompensation": {
    "portrait": "+1/3 EV",
    "landscapeStreet": "0 EV"
  },
  "contrast": [
    0.5,
    1
  ],
  "highlights": 0,
  "shadows": [
    -1,
    -1.5
  ],
  "saturation": [
    1,
    1.5
  ],
  "sharpness": [
    -2.5,
    -3
  ],
  "noiseReduction": 0,
  "intelligentDynamicRange": "AUTO",
  "diffusionFilter": "1/4 黑柔或白柔"
}
```

机身参数为作者推荐，未做实机复现验证；网页只应用 CUBE 颜色数据，不自动应用机身颗粒、清晰度、降噪或动态范围设置。

## 设置图校验

| 包内图片 | SHA-256 |
| --- | --- |
| `VOL.2 TXD kade 400/cube/机内设置.jpg` | `6e29a018df3cd4db56023ec5932724bba844cf15bc6384900d4f66d88127cc91` |
| `VOL.7 TXD 柯达5203/cube/VOL.7使用技巧.jpg` | `02505ec22ded6ccb499bf4dde7e662a10d97b1e632861ac2478a1244570a00c8` |
| `VOL.16 TXD GR3负片模拟/vol.16 B版本介绍.jpg` | `43e4c92fa2edbe9f882638d64c46626e14afe56c651bf5d95fa19bead994ba9e` |
| `VOL.16 TXD GR3负片模拟/vol.16 G版本介绍.jpg` | `2bb848ed9de076a18abc512dcd531d03d01cd540315884a33ee781668ef090d9` |
| `VOL.16 TXD GR3负片模拟/vol.16 H版本介绍.jpg` | `ba6ad80f79cb2bd37502d27c82fee1907bcbcd711af2428b9627c08b3a3a9fdc` |
| `VOL.10 TXD 青-橙 PRO/cube/机内参数.jpg` | `c6cfe0cc57e1f97bcecd27797d46091e3ddbb6e1c0ac0a711088cf3f20bdf1ec` |
| `VOL.13 TXD 柯达5207/CUBE/G版本推荐参数.jpg` | `d70d3d712f4279f3fe01c4895d55e522cab9116c00894c7efb89f1746796f127` |
| `VOL.13 TXD 柯达5207/CUBE/C和W版本推荐参数.jpg` | `2b71bedf8208cafa119cd29e7be3e0180123d293140ce9040b1eca486eaaf07b` |
| `VOL.12 TXD 富士NC/CUBE文件/加强版介绍.jpg` | `ae167ebd97f7634a5b67e183d8c41cb2d13e1224ab45a828f5c55d892d919c75` |
| `VOL.12 TXD 富士NC/CUBE文件/P版介绍.jpg` | `83eff23aa7a6653df4e09d69a62e0a02e9907af35c4ed4d67f5232427291f223` |
