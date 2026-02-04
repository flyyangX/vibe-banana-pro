const { chromium } = require('playwright');

(async () => {
  console.log('🧪 测试图片上传识别功能...\n');

  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();

  try {
    // 1. 导航到主页
    console.log('📱 打开首页...');
    await page.goto('http://localhost:3000', { waitUntil: 'networkidle', timeout: 30000 });
    console.log('✅ 首页加载成功\n');

    // 2. 检查上传功能
    console.log('🔍 检查上传区域...');
    const uploadArea = await page.$('input[type="file"]');
    if (uploadArea) {
      console.log('✅ 文件上传输入框存在');
    } else {
      console.log('⚠️ 未找到文件上传输入框，需要检查页面结构');
    }

    // 3. 检查 ReferenceFileSelector 组件
    console.log('\n🔍 检查参考文件选择器...');
    const fileSelectorExists = await page.evaluate(() => {
      // 检查是否有参考文件相关的组件
      const buttons = document.querySelectorAll('button');
      const hasUploadButton = Array.from(buttons).some(b => 
        b.textContent?.includes('上传') || b.textContent?.includes('上传文件')
      );
      return hasUploadButton;
    });
    
    if (fileSelectorExists) {
      console.log('✅ 参考文件上传按钮存在');
    }

    // 4. 测试上传 API（直接调用）
    console.log('\n🧪 测试后端图片识别功能...');
    
    // 创建一个测试图片（1x1 像素的 PNG）
    const testImageBase64 = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';
    const testImageBuffer = Buffer.from(testImageBase64, 'base64');
    
    // 使用 Playwright 的 API 上传文件
    const response = await page.evaluate(async (imageBuffer) => {
      const formData = new FormData();
      const blob = new Blob([imageBuffer], { type: 'image/png' });
      formData.append('file', blob, 'test-image.png');
      
      const result = await fetch('http://localhost:5001/api/reference-files/upload', {
        method: 'POST',
        body: formData
      });
      
      return {
        status: result.status,
        data: await result.json()
      };
    }, testImageBuffer.toJSON());

    console.log('   上传响应状态:', response.status);
    
    if (response.data?.file) {
      const file = response.data.file;
      console.log('✅ 文件上传成功');
      console.log('   - 文件名:', file.filename);
      console.log('   - 文件类型:', file.file_type);
      console.log('   - 解析状态:', file.parse_status);
      
      if (file.markdown_content) {
        console.log('✅ 图片识别成功！');
        console.log('   - 识别内容:', file.markdown_content.slice(0, 100) + '...');
      } else {
        console.log('⚠️ 图片识别未返回内容（可能正在处理或API限制）');
      }
    } else {
      console.log('❌ 文件上传失败:', response.data?.error || '未知错误');
    }

    console.log('\n🧪 测试完成');
    
  } catch (error) {
    console.error('❌ 测试出错:', error.message);
  } finally {
    await browser.close();
    console.log('\n👋 浏览器已关闭');
  }
})();
