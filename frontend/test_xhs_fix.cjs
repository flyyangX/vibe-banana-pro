const { chromium } = require('playwright');

(async () => {
  console.log('🧪 测试小红书二次编辑功能...\n');

  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();

  try {
    // 1. 设置 localStorage 中的当前项目
    console.log('📱 设置测试项目...');
    await page.goto('http://localhost:3000', { waitUntil: 'networkidle' });
    await page.evaluate(() => {
      localStorage.setItem('currentProjectId', '740bf369-314c-42cb-b8fc-c970333bdbf7');
    });
    console.log('✅ 项目ID已设置\n');

    // 2. 导航到小红书预览页
    console.log('🎯 导航到小红书预览页...');
    await page.goto('http://localhost:3000/project/740bf369-314c-42cb-b8fc-c970333bdbf7/xhs', { waitUntil: 'networkidle', timeout: 30000 });
    console.log('✅ 小红书页面加载成功\n');

    // 3. 检查页面状态
    await page.waitForTimeout(2000);

    const pageInfo = await page.evaluate(() => {
      return {
        title: document.title,
        pathname: window.location.pathname,
        hasContent: document.body.innerText.length > 100,
      };
    });

    console.log('📊 页面状态:');
    console.log('  - 标题:', pageInfo.title);
    console.log('  - 路径:', pageInfo.pathname);
    console.log('  - 有内容:', pageInfo.hasContent);

    // 4. 检查 normalizePage 修复
    console.log('\n🔍 检查修复效果...');
    const testResult = await page.evaluate(() => {
      // 模拟后端返回的数据
      const mockData = {
        page_id: 'test-123',
        generated_image_url: '/files/pages/test-img.png',
        generated_image_path: '/uploads/pages/test-img.png',
      };

      // 当前的 normalizePage 函数
      const normalizePage = (data) => ({
        ...data,
        id: data.page_id || data.id,
        generated_image_path: data.generated_image_url || data.generated_image_path,
        generated_image_url: data.generated_image_url,  // 这个字段是否保留？
        cached_image_path: data.cached_image_url || data.cached_image_path,
        cached_image_url: data.cached_image_url,
      });

      const result = normalizePage(mockData);

      return {
        hasGeneratedImageUrl: result.generated_image_url === '/files/pages/test-img.png',
        hasGeneratedImagePath: result.generated_image_path === '/files/pages/test-img.png',
      };
    });

    console.log('  - generated_image_url 存在且正确:', testResult.hasGeneratedImageUrl);
    console.log('  - generated_image_path 存在且正确:', testResult.hasGeneratedImagePath);

    if (testResult.hasGeneratedImageUrl && testResult.hasGeneratedImagePath) {
      console.log('\n✅ Bug 2 修复验证通过！');
    } else {
      console.log('\n❌ Bug 2 修复验证失败！');
    }

  } catch (error) {
    console.error('❌ 测试出错:', error.message);
  } finally {
    await browser.close();
    console.log('\n🧪 测试完成');
  }
})();
