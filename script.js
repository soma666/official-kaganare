// script.js

// 获取图标和提示信息元素
const podcastIcon = document.getElementById('podcastIcon');
const copyMessage = document.getElementById('copyMessage');

// RSS 链接
const rssLink = 'd6gnt9hx86fv.xml';

// 当用户点击图标时，复制 RSS 链接到剪贴板
podcastIcon.addEventListener('click', () => {
  // 创建一个临时的文本框
  const tempInput = document.createElement('input');
  tempInput.style.position = 'absolute';
  tempInput.style.left = '-9999px'; // 隐藏文本框
  tempInput.value = rssLink;

  // 添加临时文本框到页面
  document.body.appendChild(tempInput);

  // 选择文本框的内容
  tempInput.select();
  tempInput.setSelectionRange(0, 99999); // 对于移动设备

  // 复制内容到剪贴板
  document.execCommand('copy');

  // 移除临时文本框
  document.body.removeChild(tempInput);

  // 显示复制成功消息
  copyMessage.style.display = 'block';

  // 2 秒后隐藏成功消息
  setTimeout(() => {
    copyMessage.style.display = 'none';
  }, 2000);
});
