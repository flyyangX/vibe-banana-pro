const { chromium } = require('playwright');

(async () => {
  console.log('🧪 测试小红书二次编辑功能...\n');

  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();

  // 监听控制台消息
  page.on('console', msg => {
    console.log('浏览器:', msg.text());
  });

  try {
    // 1. 打开前端
    console.log('📱 打开 http://localhost:3000...');
    await page.goto('http://localhost:3000', { waitUntil: 'networkidle', timeout: 30000 });
    console.log('✅ 页面加载成功\n');

    // 2. 检查 localStorage 中的项目
    const projectId = await page.evaluate(() => localStorage.getItem('currentProjectId'));
    console.log('📁 当前项目ID:', projectId);

    if (projectId) {
      // 3. 导航到小红书预览页
      console.log('\n🎯 导航到小红书预览页...');
      await page.goto(`http://localhost:3000/project/${projectId}/xhs`, { waitUntil: 'networkidle', timeout: 30000 });
      console.log('✅ 小红书页面加载成功');

      // 4. 检查页面结构
      await page.waitForTimeout(2000);

      // 获取页面信息
      const info = await page.evaluate(() => {
        return {
          title: document.title,
          url: window.location.pathname,
          hasProject: !!window.__REDUX_STATE__?.currentProject || !!window.currentProject,
        };
      });

      console.log('\n📊 页面状态:');
      console.log('  - 标题:', info.title);
      console.log('  - 路径:', info.url);

      // 检查是否有小红书卡片
      const cards = await page.$$('[class*="card"], .xhs, .xhs-card');
      console.log('  - 卡片元素数:', cards.length);

    } else {
      console.log('\n❌ 没有当前项目');
      console.log('💡 请少爷先在浏览器里创建一个项目');
    }

  } catch (error) {
    console.error('❌ 测试出错:', error.message);
  } finally {
    await browser.close();
    console.log('\n🧪 测试完成');
  }
})();
