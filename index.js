const firebaseConfig = {
    apiKey: "AIzaSyAvviywFxU5-Ia23Hqsl_3ItrsxF6oYLqA",
    authDomain: "ctjh-84ffc.firebaseapp.com",
    projectId: "ctjh-84ffc",
    storageBucket: "ctjh-84ffc.appspot.com",
    messagingSenderId: "81707489957",
    appId: "1:81707489957:web:f8c441380b528d77018b4c",
    measurementId: "G-NM1KMK8HT9"
  };
  
      firebase.initializeApp(firebaseConfig);
      const db = firebase.firestore();
      const storage = firebase.storage();
  
      const postContent = document.getElementById('postContent');
      const charCount = document.getElementById('charCount');
      const submitButton = document.getElementById('submitButton');
      const postMedia = document.getElementById('postMedia');
      const mediaPreview = document.getElementById('mediaPreview');
      const postCount = document.getElementById('postCount');
  
      function updateCharCount() {
          const currentLength = postContent.value.length;
          charCount.textContent = `已輸入 ${currentLength} 字`;
          
          if (currentLength < 3) {
              charCount.classList.add('text-red-400');
          } else {
              charCount.classList.remove('text-red-400');
          }
      }
  
      postContent.addEventListener('input', updateCharCount);
  
      postMedia.addEventListener('change', function(e) {
          handleMediaFiles(e.target.files);
      });
  
      function handleMediaFiles(files) {
          const totalFiles = mediaPreview.children.length + files.length;
          if (totalFiles > 1) {
              alert('最多只能上傳一個檔案');
              return;
          }
  
          Array.from(files).forEach(file => {
              const reader = new FileReader();
              reader.onload = function(e) {
                  const mediaElement = document.createElement('img');
                  mediaElement.src = e.target.result;
                  mediaElement.classList.add('w-full', 'h-full', 'object-cover', 'rounded-xl', 'shadow-lg', 'transition-all');
                  const deleteButton = createDeleteButton();
                  const container = document.createElement('div');
                  container.classList.add('relative');
                  container.appendChild(mediaElement);
                  container.appendChild(deleteButton);
                  mediaPreview.appendChild(container);
              }
              reader.readAsDataURL(file);
          });
      }
  
      function createDeleteButton() {
          const deleteButton = document.createElement('button');
          deleteButton.innerHTML = '×';
          deleteButton.classList.add('absolute', 'top-2', 'right-2', 'bg-red-500', 'text-white', 'rounded-full', 'w-8', 'h-8', 'flex', 'items-center', 'justify-center', 'text-xl', 'font-bold', 'hover:bg-red-600', 'transition-colors', 'shadow-lg');
          deleteButton.addEventListener('click', function(e) {
              e.preventDefault();
              this.parentElement.remove();
          });
          return deleteButton;
      }
  
      document.getElementById('postForm').addEventListener('submit', async function(e) {
          e.preventDefault();
          
          const content = postContent.value;
          
          if (content.trim().length < 3) {
              alert('請輸入至少3個字');
              return;
          }
          
          submitButton.innerHTML = '<div class="spinner mx-auto"></div>';
          submitButton.disabled = true;
          
          try {
              // 獲取當前貼文數量
              const postsSnapshot = await db.collection('posts').get();
              const nextPostNumber = postsSnapshot.size + 1;
  
              // 獲取 IP 地址
              const ipResponse = await fetch('https://api.ipify.org?format=json');
              const ipData = await ipResponse.json();
              const ipAddress = ipData.ip;
  
              // 處理媒體文件上傳
              const mediaUrls = [];
              if (postMedia.files.length > 0) {
                  const file = postMedia.files[0];
                  const storageRef = storage.ref('media/' + Date.now() + '_' + file.name);
                  await storageRef.put(file);
                  const url = await storageRef.getDownloadURL();
                  mediaUrls.push({
                      url: url, 
                      type: 'image'
                  });
              }
  
              // 獲取所有用戶並隨機選擇一個
              const usersSnapshot = await db.collection('users').get();
              let assignedUser = 'system';
              let postRef;
  
              if (!usersSnapshot.empty) {
                  const users = usersSnapshot.docs;
                  const randomUser = users[Math.floor(Math.random() * users.length)];
                  assignedUser = randomUser.id;
              }
  
              // 建立貼文資料
              const postData = {
                  content: content,
                  mediaUrls: mediaUrls,
                  createdAt: firebase.firestore.FieldValue.serverTimestamp(),
                  ipAddress: ipAddress,
                  status: 'pending',
                  createdDate: new Date().toISOString(),
                  postNumber: nextPostNumber,
                  assignedUser: assignedUser
              };
  
              // 新增貼文
              postRef = await db.collection('posts').add(postData);
  
              // 如果有指派給實際用戶（不是系統），更新用戶資料
              if (assignedUser !== 'system') {
                  await db.collection('users').doc(assignedUser).update({
                      assignedPosts: firebase.firestore.FieldValue.arrayUnion({
                          postId: postRef.id,
                          assignedAt: new Date().toISOString()
                      })
                  });
              }
  
              // 成功處理
              submitButton.innerHTML = '發布成功！';
              submitButton.classList.add('bg-emerald-500');
              
              const message = document.createElement('div');
              message.className = 'mt-6 p-5 bg-emerald-500/20 text-emerald-300 rounded-xl text-center fade-in font-medium text-lg';
              message.textContent = '請耐心等待審核';
              this.insertAdjacentElement('afterend', message);
              
              // 重置表單
              setTimeout(() => {
                  this.reset();
                  charCount.textContent = '已輸入 0 字';
                  charCount.classList.remove('text-red-400');
                  submitButton.innerHTML = '發布貼文 <svg class="h-7 w-7 ml-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M14 5l7 7m0 0l-7 7m7-7H3"/></svg>';
                  submitButton.disabled = false;
                  submitButton.classList.remove('bg-emerald-500');
                  message.remove();
                  mediaPreview.innerHTML = '';
              }, 3000);
  
          } catch (error) {
              console.error("發布失敗: ", error);
              alert('發布失敗，請稍後再試');
              submitButton.innerHTML = '發布貼文 <svg class="h-7 w-7 ml-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M14 5l7 7m0 0l-7 7m7-7H3"/></svg>';
              submitButton.disabled = false;
          }
      });
  
      // 生成星星的函數
      function createStars() {
          const container = document.getElementById('starsContainer');
          const starCount = 150; // 增加星星數量
  
          for (let i = 0; i < starCount; i++) {
              const star = document.createElement('div');
              star.className = 'star';
              
              const left = Math.random() * 100;
              star.style.left = `${left}%`;
              
              const size = Math.random() * 4;
              star.style.width = `${size}px`;
              star.style.height = `${size}px`;
              
              const duration = 4 + Math.random() * 8;
              star.style.setProperty('--duration', `${duration}s`);
              
              const delay = Math.random() * 5;
              star.style.animationDelay = `${delay}s`;
              
              container.appendChild(star);
          }
      }
  
      window.addEventListener('load', createStars);
  
      async function updatePostCount() {
          const snapshot = await db.collection('posts').get();
          postCount.textContent = `目前貼文數量：${snapshot.size}`;
      }
  
      window.addEventListener('load', updatePostCount);