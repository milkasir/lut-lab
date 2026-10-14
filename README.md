# LUT LAB · 在线调色实验室

一个可以直接部署到 **GitHub Pages** 的中文 LUT 在线比较工具。纯 HTML / CSS / JavaScript，没有构建步骤或自建后端。访客比较图片不需要登录；管理员可通过 GitHub API 在线发布公共图片和 LUT。

仓库：[milkasir/lut-lab](https://github.com/milkasir/lut-lab)。公开站点部署地址：`https://milkasir.github.io/lut-lab/`；管理页：`https://milkasir.github.io/lut-lab/manage.html`。

## 先运行一下

在 Windows 中双击 **`启动本地预览.cmd`**，然后在浏览器打开窗口里给出的地址，通常是：

`http://127.0.0.1:8787/`

有 Node.js 时使用 Node；没有时自动使用 Windows PowerShell，在 `http://localhost:8787/` 提供预览。保持这个命令窗口打开，关闭窗口或按 Ctrl+C 就会停止。不要直接双击 `index.html`：浏览器会阻止 `file://` 页面读取内置 CUBE。

也可以在本站目录运行：

```shell
node tools/serve.cjs
```

不需要运行 `npm install`。

## 已有功能

- 保留原整理包 **35 个 CUBE 的原始字节**及中文名称、分类、名称来历、证据状态和来源链接；点击素材库中的名称查看说明与下载文件。
- 自带两张 Panasonic DC-S9 原照片的 **1800 × 1200 sRGB 缩小版**，以及一张程序生成的色块 / 灰阶 / RGB 渐变测试卡。
- 普通比较工作台支持多文件临时上传和拖入图片、CUBE，这些文件只在访客浏览器内处理。管理员从独立管理页发布的文件会保存到连接的 GitHub 仓库。
- 点击 **新增窗格**持续添加，数量没有人为上限；可逐个移除、自由设列数，每格独立选图、选 LUT、调强度。预览按视野载入，离开视野会释放画布缓存。
- 原图分割比较、放大、平移；收藏、搜索、分类筛选，多选 LUT 放进工作台；LUT 菜单采用可搜索的深色自绘列表，避免原生下拉的白底问题。
- 独立 `manage.html` 在线管理页：连接仓库后上传图片和 CUBE，点一次发布，把文件、缩略图与清单作为一个提交保存，Pages 自动应用更新。备用 ZIP 方式仍可用。
- 前置转换 LUT、标准输入曝光偏移、手动标记图片编码 / LUT 期望输入。
- sRGB → V-Log / V-Gamut、sRGB → F-Log2 / F-Gamut 前置编码。两款 FLog2 已由维护者验证，自动匹配会给标准图片应用 F-Log2 转换，F-Log2 原片直接输入。
- WebGL2 加速；不支持 GPU 时回退到 Web Worker CPU，Worker 不可用时用分块 CPU。
- 一键导出 PNG，或自定义导出 PNG / JPEG 联系表；包含名称、图片、强度、输入转换、匹配提示。
- 保存 / 载入 JSON 参数方案；刷新时恢复内置素材的工作台与收藏。
- 手机适配、键盘焦点、状态提示、减少动态效果支持。

## 怎么使用

1. 点击图片缩略图，再点 **应用到所有窗格**。需要每格不同图片时，在窗格内单独选择。
2. 在素材库勾选 LUT，点 **对比所选 LUT**，会全部放入工作台并附带原图；也可以用窗格的可搜索 LUT 菜单。点 **新增窗格**继续添加，点右上角 × 移除。
3. 调强度、选效果图 / 原图分割。效果图模式下点击图片可放大；分割模式可双击图片或聚焦窗格图片后按 Enter 放大。放大窗口中拖动平移，调整缩放或分界滑块。
4. **一键导出**：素材库有勾选时，导出所选 LUT 在当前选中图片上的总览，使用 100% 强度、自动匹配输入并带原图；没有勾选时，导出当前窗格和各自的参数。
5. 需要保留实验转换、强度或不同图片，打开 **导出对比图 → 当前窗格**。需要所选 LUT 与多张图片的组合，选择 **所选 LUT × 所选图片**。
6. 保存方案得到 JSON。自上传文件不会嵌入 JSON，刷新后先重新上传相应图片与 CUBE，再载入方案；按文件名匹配。缺失素材会提示并使用原图 / 示例代替。同名不同内容的文件应重命名以免混淆。

## “不兼容”到底改进了什么

原包 35 个 CUBE 都是完整的 33³ LUT。原来标成输入不匹配的三款并不是坏文件。本站把 **解析 / 载入失败** 与 **输入编码不匹配** 分开处理。

| 文件 | 现在的处理 | 尚需确认 |
| --- | --- | --- |
| Portra400X5 D2 Plady | 正常实时渲染；可上传 D2 原片，或给窗格选择经过验证的前置转换 LUT | 本包没有可验证的标准 JPG → Cinelike D2 变换，未编造转换曲线 |
| FLog2_NC | 输入已由维护者实测确认为 F-Log2；自动转换标准图片，F-Log2 原片直接输入 | 原文件 VLOG 注释保留，站点用已确认的元数据覆盖输入判断 |
| FLog2_PROVIA | 同上，按 F-Log2 输入处理 | 同上 |

前置编码先把显示用 sRGB 反解到线性，变换到相应色域，再按厂商公式编码 Log。它能让普通图片进入更接近 LUT 目标编码的数值范围，便于探索；**不能重建原片已经丢失的场景线性信息、高光或动态范围**。它不等于相机内还原。两款 FLog2 的输入判定采用维护者的实测确认，原始 CUBE 字节没有改动。导出图会写明实际使用的转换。

“图片编码”声明素材的已有编码；在「自动匹配」模式中，这个标记用于决定标准图片是否需要 F-Log2 前置编码，标记本身不改变文件。手动「LUT 期望输入」只调整匹配提示。对于真实 Log 原片，请准备保留 Log 数值、未经自动显示变换的 JPG / PNG，使用直接输入。浏览器 ICC 解码与 8-bit 预览不是完整视频色彩管理，HDR、RAW、相机特定输出曲线请在专业软件中处理。

支持标准 CUBE 的 1D、3D、1D+3D shaper、`DOMAIN_MIN/MAX`、`LUT_1D_INPUT_RANGE` / `LUT_3D_INPUT_RANGE`、BOM、CRLF、空白与科学计数法。保留范围外浮点输出，显示时裁切至 0–1；不完整行数、无效数字、重复或未知标头会报告诊断，避免静默产生错误颜色。

3DL、CSP、CLF、LOOK、Hald 等格式请先导出为标准 `.cube`。RAW / DNG / HEIC 请先转换图片。上传限制：LUT 70 MB，图片 40 MB / 6000 万像素，每次会话最多 12 张临时上传图片，公共内置图片不受这个数量限制。预览最长边 1600 px；解码工作副本最长边 3200 px。每格导出可选 640 / 1000 / 1600 px，实际图片保留完整构图、不强制放大，整张限制 32 MP 且任一边不超过 16000 px。

## 在 GitHub 部署：推荐网页操作

以下步骤使用 GitHub Pages 的 **Deploy from a branch**，不用 Actions 或构建工具。

### 1. 建一个公开仓库

登录 GitHub，点右上角 **＋ → New repository**：

- Repository name：例如 `lut-lab`。
- Visibility：选 **Public**。
- 点 **Create repository**。

### 2. 上传本站文件夹里面的内容

如果拿到的是 ZIP，先解压。打开解压后的 `lut-lab` 文件夹，上传其**内部文件与目录**，不要上传 ZIP 本身，也不要让仓库根目录只出现一个 `lut-lab` 文件夹。

仓库页面选择 **Add file → Upload files**；空仓库也可以点击页面中的 **uploading an existing file**。将文件夹内部的文件及子文件夹一起拖入，点 **Commit changes**。

完成后根目录必须能直接看到下面这些内容：

```text
lut-lab/                       ← 本地目录名；不额外套进仓库根层
  index.html                   ← 在仓库根目录
  styles.css
  manage.html                  ← 独立维护页
  manage.css
  .nojekyll
  .gitignore
  README.md
  LICENSE
  assets/
    catalog.js
    favicon.svg
    images/
    luts/
  js/
    app.js
    lut-picker.js
    manage.js
    library-tools.js
    github-publisher.js
    renderer.js
    lut-core.js
    lut-worker.js
  tools/
  tests/
  启动本地预览.cmd
```

如果网页拖拽不方便，使用 GitHub Desktop 的 **File → Add local repository**，按提示创建本地仓库、提交全部文件，然后 **Publish repository**，取消 **Keep this code private**。不要把原始整理包的 69 MB PDF、70 张效果图和 ZIP 全部放进站点：这里已提供实时渲染和精简素材。

### 3. 开启 Pages

打开仓库 **Settings → Pages**，在 **Build and deployment** 中：

- Source：**Deploy from a branch**。
- Branch：**main**。
- Folder：**/ (root)**。
- 点 **Save**。

如果你的默认分支实际叫别的名字，选实际存放 `index.html` 的那个分支。`.nojekyll` 用于直接提供静态文件；缺少它时可以在仓库根目录点 **Add file → Create new file**，文件名填 `.nojekyll`，留空并提交。

### 4. 打开公开网址

部署完成后，Pages 页面会显示网址。普通项目仓库通常是：

```text
https://你的GitHub用户名.github.io/lut-lab/
```

仓库名字不同，末尾路径也不同；直接使用 Pages 页面给出的地址最可靠。网站所有资源都用相对路径，支持这种仓库子路径，不用改代码。后续更新文件并提交到发布分支，会触发更新部署。

GitHub 官方依据：[配置 Pages 发布源](https://docs.github.com/en/pages/getting-started-with-github-pages/configuring-a-publishing-source-for-your-github-pages-site)、[GitHub Pages 快速开始](https://docs.github.com/en/pages/quickstart)。部署说明核对日期：2026-10-14。

### 常见问题

- **404**：确认已开启 Pages，选择的分支正确，`index.html` 直接在根目录；检查仓库 **Actions** / Pages 页面显示的部署状态。
- **样式、LUT 或图片打不开**：确认 `assets/` 和 `js/` 整个目录已上传，文件名大小写没有被改动，没有只上传 HTML。
- **更新后还是旧页面**：等部署成功，再强制刷新（Ctrl+F5）。
- **本地图片正常，内置 LUT 失败**：使用启动脚本，避免 `file://`；端口占用时关闭另一个预览。Node 可设置 `LUT_LAB_PORT`，PowerShell 可运行 `powershell -NoProfile -ExecutionPolicy Bypass -File tools/serve.ps1 -Port 8788`。
- **浏览器下载没有立刻弹出**：查看下载列表，导出大图时稍等。导出失败可减少宽度、图片或 LUT 数量。
- **手机找不到素材库**：窄屏时素材库在工作台下方；窗格自带的下拉选择也可以直接挑 LUT。

## 在线直接上传图片和 LUT

先把本次新版站点文件上传到你的仓库并完成 Pages 部署。以后无需下载更新包、解压或手工编辑清单。

### 首次连接

1. 打开 **站点网址/manage.html**。管理入口独立于普通比较页。
2. 点击 **创建授权令牌**，在 GitHub 创建 fine-grained personal access token。选择 **Only select repositories**，只选这个站点仓库；**Repository permissions → Contents → Read and write**。Metadata 的读取权限由 GitHub 自动提供，不需要给全部仓库权限。
3. 回到管理页，填 **用户名/仓库名** 和令牌，点 **连接仓库**。默认使用仓库默认分支；如果 Pages 发布分支不同，在折叠的高级设置中填写相应分支。站点在仓库 docs 目录时填 docs，根目录留空。

仓库地址会记住，令牌只保留在当前页面内存，刷新 / 重新打开后需要重新输入。令牌不会写入 ZIP、素材清单或 localStorage，只发送给 api.github.com。断开连接会清除令牌，清除连接配置会移除记住的仓库地址。

授权依据：[GitHub 官方令牌说明](https://docs.github.com/en/authentication/keeping-your-account-and-data-secure/managing-your-personal-access-tokens)、[创建 Git 对象所需 Contents 写权限](https://docs.github.com/en/rest/git/trees)。

### 以后更新

1. 在管理页点 **上传图片或 LUT**，可多选、混选 JPG / PNG / WebP / AVIF 和 .cube。
2. 名称可以直接沿用文件名，或填写新名称、分类、输入基底。图片默认标准 sRGB；不清楚 LUT 输入时保留未知。
3. 点 **发布更新**。素材、图片缩略图和完整清单一起保存到已连接仓库的发布分支，随后 Pages 自动发布。
4. 页面会区分「素材已提交」与「公共站点已应用更新」。检测到新清单上线后显示发布完成，打开公开站点即可使用。通常需要等待 Pages 部署，而非即时改变线上文件。

管理页默认只显示本次新素材，勾选 **显示已有素材** 可以编辑原有名称、分类、编码，也可以点「删除」。删除先标记，发布前可撤销；发布后条目及对应素材、图片缩略图一起从当前分支删除。共用文件仍有条目引用时保留，至少保留一张公共图片。Git 历史提交仍可能保留已删除的文件。

发布前读取最新仓库清单，自动保留其他人的新增素材，并合并不同字段的修改；同一字段冲突时停止并保留待发布内容。分支更新使用非强制方式。GitHub 分支规则不允许直接提交时会报告失败，文件保留在本次页面会话中，可使用备用离线包。

如果浏览器无法检查网站的发布进度，管理页仍会给出本次提交与站点链接；可在 GitHub Pages 部署完成后打开站点查看。关闭页面前请完成发布或下载备用包，未发布的素材只在当前页面内存中。

提交与部署依据：[GitHub Git 数据库 API](https://docs.github.com/en/rest/guides/using-the-rest-api-to-interact-with-your-git-database)、[Pages 分支发布源](https://docs.github.com/en/pages/getting-started-with-github-pages/configuring-a-publishing-source-for-your-github-pages-site)。

### 备用离线方式

展开「离线更新包」，可以下载完整清单及新增文件，手动合并 assets 后提交。也可以直接维护 assets/catalog.js：LUT 放 assets/luts/，公共图片放 assets/images/，在相应数组登记 id、name、filename、path、base 等字段。

## 图片隐私与删除

管理页上传的公共图片先在浏览器中解码，再通过 canvas 重新编码；只上传清理后的文件和缩略图，原始图片字节不会进入仓库。JPEG 重新编码为 JPEG，PNG / WebP / AVIF 编码为 PNG，最长边 3200 像素。EXIF（包含拍摄时间、GPS、相机序列号等）、XMP、IPTC 和注释不随原图复制，生成文件再次检查 JPEG / PNG / WebP 的附加信息块。编码后的哈希用于生成文件名，避免把原始文件名直接放进素材路径。

本站现有 3 张示例图经独立图像库检查，均没有 EXIF、XMP、IPTC；两张静物照片经画面检查，未发现人脸、证件、地址或联系方式。清理附加信息无法去掉照片画面、显示名称中已有的个人信息，发布前请检查预览和名称。浏览器不支持的格式会拒绝上传。

点击「显示已有素材」→ 对应条目「删除」→「发布更新」。发布前可点「撤销」。当前分支和网页会移除相关文件，但公开 Git 历史、已下载副本和缓存不能靠这个按钮擦除。误传敏感素材时还需处理 Git 历史及缓存。离线 ZIP 不会自动删除旧文件，按其中的删除清单手动移除。

普通比较工作台临时上传的图片只在自己的浏览器中处理；导出的对比图经过 canvas 编码，不复制原始 EXIF。

## 素材与代码

新增站点代码采用 MIT（见 `LICENSE`）；第三方 LUT、名称资料、示例照片仍保留原有权利，MIT 不覆盖这些素材。本包不授予第三方素材的再分发许可。公开仓库中的素材可被访客下载，请只保留你有权公开的图片和 LUT。

新增自己的公共示例：把图片放入 `assets/images/`，在 `assets/catalog.js` 的 `IMAGE_CATALOG` 里登记 `id/name/filename/path/base`。新增公共 LUT：把 `.cube` 放入 `assets/luts/`，在 `LUT_CATALOG` 登记 `id/name/filename/path/category/base`。`base` 使用 `STD`、`VLOG`、`FLOG2`、`CNED2` 或 `UNKNOWN`，不要为未验证的文件随意指定输入。

普通比较工作台的访客上传只进入自己的会话。独立管理页只有在连接仓库并点击发布后，才把选中公共素材上传到 GitHub；无需自建服务器。站点不使用统计脚本或远程字体。

## 开发与验证

```shell
node --test tests/*.test.cjs
```

26 项测试覆盖 LUT 数学、解析、原始文件哈希、已确认输入覆盖、ZIP，以及在线发布的一次提交、目录保留、并发合并、分支保护、响应丢失核实、令牌清除、目标限制、真实文件删除、共用文件保留及图片附加信息检查。上传和删除逻辑使用本地模拟 API 验证；站点源码与已校验的素材通过 GitHub 连接上传到上述仓库。参见 `验证记录.md`。

技术来源：[Panasonic V-Log / V-Gamut 官方手册](https://pro-av.panasonic.net/en/cinema_camera_varicam_eva/support/pdf/VARICAM_V-Log_V-Gamut.pdf)、[FUJIFILM F-Log2 官方数据表](https://dl.fujifilm-x.com/support/lut/F-Log2_DataSheet_E_Ver.1.0.pdf)。色域矩阵和转移函数按上述厂商资料实现；F-Gamut 采用 BT.2020 原色，sRGB 与 BT.709 使用相同原色。
