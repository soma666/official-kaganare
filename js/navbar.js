// navbar.js - 导航栏模块

// 导航栏HTML内容
const navbarHTML = `
  <nav class="navbar">
    <div class="nav-container">
      <a class="nav-logo">幕前须知 KAGENARE</a>
      <div class="hamburger">
        <div></div>
        <div></div>
        <div></div>
      </div>
      <ul class="nav-menu">
        <li><a href="/">首页</a></li>
        <li><a href="/zero-cost-skzlive.html">如何参与樱坂46现场演出门票FanClub抽选？</a></li>
      </ul>
    </div>
  </nav>
`;

// 导航栏CSS样式
const navbarCSS = ``;

// 初始化导航栏
function initNavbar() {
  // 将导航栏插入到页面顶部
  document.body.insertAdjacentHTML('afterbegin', navbarHTML);
  
  // 导航栏样式已移至CSS文件中统一管理
  
  // 添加移动端菜单切换功能
  document.addEventListener('DOMContentLoaded', function() {
    const hamburger = document.querySelector('.hamburger');
    const navMenu = document.querySelector('.nav-menu');
    
    if (hamburger && navMenu) {
      hamburger.addEventListener('click', () => {
        navMenu.classList.toggle('active');
      });
    }
  });
}

// 执行初始化
initNavbar();