const isPostPage = document.getElementById("postForm") !== null;
const isWallPage = document.getElementById("postWall") !== null;
const totalComments = document.getElementById("totalComments");
// const backend_URI = "https://sun-photo-be.vercel.app/";

// TOAST NOTIFICATION FUNCTION
function showToast(message, type = 'error') {
  let container = document.getElementById('toast-container');
  if (!container) {
    container = document.createElement('div');
    container.id = 'toast-container';
    container.className = 'fixed top-5 right-5 z-50 flex flex-col gap-3';
    document.body.appendChild(container);
  }

  const toast = document.createElement('div');
  const bgColor = type === 'success' ? 'bg-[#fdb44b]' : 'bg-red-500';
  const icon = type === 'success' ? 'fa-check-circle' : 'fa-exclamation-circle';

  toast.className = `${bgColor} text-white px-5 py-3 rounded-xl shadow-xl flex items-center gap-3 transform transition-all duration-300 translate-x-full opacity-0`;
  toast.innerHTML = `<i class="fa-solid ${icon} text-lg"></i><span class="text-sm font-medium">${message}</span>`;

  container.appendChild(toast);

  setTimeout(() => toast.classList.remove('translate-x-full', 'opacity-0'), 10);

  setTimeout(() => {
    toast.classList.add('translate-x-full', 'opacity-0');
    setTimeout(() => toast.remove(), 300);
  }, 3000);
}

// SECTION 1: POST PAGE
if (isPostPage) {
  const postForm = document.getElementById("postForm");
  const nameInput = document.getElementById('name');
  const imageInput = document.getElementById("imageInput");
  const imagePreview = document.getElementById("imagePreview");
  const commentInput = document.getElementById("commentInput");
  const fileNameSpan = document.getElementById("fileName");

  const profileInput = document.getElementById("profileInput");
  const profilePreview = document.getElementById("profilePreview");
  const profileIcon = document.getElementById("profileIcon");
  const profileFileName = document.getElementById("profileFileName");
  const employeeId = document.getElementById("empID");
  const photoTitle = document.getElementById("photoTitle");

  // Reusable Image Preview Handler
  const handleImagePreview = (input, previewEl, fileNameEl, errorMsg, isProfile = false) => {
    input.addEventListener("change", () => {
      const file = input.files[0];
      if (!file) {
        if (isProfile) {
          previewEl.innerHTML = `<i id="profileIcon" class="fa-regular fa-user text-4xl text-gray-600"></i>`;
        } else {
          previewEl.src = "";
          previewEl.classList.add("hidden");
        }
        if (fileNameEl) fileNameEl.textContent = "No file chosen";
        return;
      }

      const ext = file.name.split('.').pop().toLowerCase();
      const allowedExts = ['jpg', 'jpeg', 'png', 'gif', 'webp', 'heic', 'heif', 'bmp', 'svg', 'tiff', 'tif'];
      const isImage = file.type.startsWith("image/") || allowedExts.includes(ext);

      if (!isImage) {
        showToast(errorMsg, "error");
        input.value = "";
        return;
      }

      if (fileNameEl) fileNameEl.textContent = file.name;

      const reader = new FileReader();
      reader.onload = (e) => {
        if (isProfile) {
          previewEl.innerHTML = `<img src="${e.target.result}" class="w-full h-full object-cover rounded-xl" />`;
        } else {
          previewEl.src = e.target.result;
          previewEl.classList.remove("hidden");
        }
      };
      reader.readAsDataURL(file);
    });
  };

  handleImagePreview(profileInput, profilePreview, profileFileName, "Please upload a valid profile image.", true);
  handleImagePreview(imageInput, imagePreview, fileNameSpan, "Please upload a valid image file.", false);

  // 2. Handle Form Submission
  postForm.addEventListener("submit", async (e) => {
    e.preventDefault();

    const submitBtn = postForm.querySelector('button[type="submit"]');
    const originalBtnText = submitBtn.innerHTML;

    const setButtonState = (isLoading) => {
      submitBtn.disabled = isLoading;
      submitBtn.innerHTML = isLoading ? `<i class="fa-solid fa-spinner fa-spin"></i> Submitting...` : originalBtnText;
      submitBtn.classList.toggle("opacity-50", isLoading);
      submitBtn.classList.toggle("cursor-not-allowed", isLoading);
    };

    const name = nameInput.value.trim();
    const empID = employeeId.value.trim();
    const phTitle = photoTitle.value.trim();
    const comment = commentInput.value.trim();
    const file = imageInput.files[0];
    const profileFile = profileInput.files[0];

    if (!name || !empID || !phTitle || !file) {
      showToast("Please upload all required fields.", "error");
      return;
    }

    const wordCount = comment ? comment.split(/\s+/).length : 0;
    if (wordCount > 150) {
      showToast("Your story must not exceed 150 words.", "error");
      return;
    }

    setButtonState(true);

    // Build FormData for multipart upload
    const formData = new FormData();
    formData.append("name", name);
    formData.append("empID", empID);
    formData.append("phTitle", phTitle);
    formData.append("comment", comment || "No comment provided.");
    formData.append("date", new Date().toLocaleString());
    formData.append("image", file);

    if (profileFile) {
      formData.append("profileImage", profileFile);
    }

    try {
      const saved = await savePost(formData);

      if (!saved) {
        showToast("Failed to upload post. Please try again.", "error");
        return;
      }

      // Reset form
      postForm.reset();
      imagePreview.classList.add("hidden");
      profilePreview.innerHTML = `<i id="profileIcon" class="fa-regular fa-user text-4xl text-gray-600"></i>`;
      if (profileFileName) profileFileName.textContent = "No file chosen";
      if (fileNameSpan) fileNameSpan.textContent = "No file chosen";

      showToast("Post uploaded successfully!", "success");
    } catch (error) {
      console.error("Submission error:", error);
      showToast("An unexpected error occurred.", "error");
    } finally {
      setButtonState(false);
    }
  });
}

// SECTION 2: WALL PAGE
if (isWallPage) {
  const postWall = document.getElementById("postWall");

  let currentPage = 1;
  let totalPostsCount = 0;

  const postsContainer = document.createElement("div");
  const loadMoreBtn = document.getElementById("loadMoreBtn");

  postWall.appendChild(postsContainer);

  const loadPosts = async () => {
    if (currentPage === 1) {
      postsContainer.innerHTML = `<p class="text-center text-[#3e6b4f] mt-10"><i class="fa-solid fa-spinner fa-spin mr-2"></i>Loading moments...</p>`;
    } else {
      loadMoreBtn.innerHTML = `<i class="fa-solid fa-spinner fa-spin mr-2"></i>Loading...`;
      loadMoreBtn.disabled = true;
    }

    const data = await getPosts(currentPage);

    // Fallback logic in case the Vercel backend hasn't updated yet
    const isArrayFormat = Array.isArray(data);
    const posts = isArrayFormat ? data : (data.posts || []);
    totalPostsCount = isArrayFormat ? data.length : (data.total || 0);

    if (totalComments) {
      totalComments.innerText = totalPostsCount;
    }

    if (currentPage === 1) {
      postsContainer.innerHTML = "";
    }

    if (posts.length === 0 && currentPage === 1) {
      postsContainer.innerHTML = `<p class="text-center text-gray-400 mt-10">No posts yet.</p>`;
    } else {
      posts.forEach(post => renderPost(post, postsContainer));
    }

    // Handle "Load More" button visibility
    if (currentPage * 5 >= totalPostsCount) {
      loadMoreBtn.classList.add("hidden");
    } else {
      loadMoreBtn.classList.remove("hidden");
      loadMoreBtn.innerText = "Load More Comments";
      loadMoreBtn.disabled = false;
    }
  };

  loadMoreBtn.addEventListener("click", () => {
    currentPage++;
    loadPosts();
  });

  // Initial load
  loadPosts();
}

// SECTION 3: STORAGE FUNCTIONS
// ----------- Locally saving on browser ----------
// function savePost(post) {
//   const posts = getPosts();
//   posts.push(post);
//   localStorage.setItem("baxterPosts", JSON.stringify(posts));
// }

// function getPosts() {
//   return JSON.parse(localStorage.getItem("baxterPosts")) || [];
// }
// ------------------------------------------------
async function savePost(formData) {
  try {
    const response = await fetch(`https://sun-photo-be.vercel.app/api/posts`, {
    // const response = await fetch(`http://localhost:5000/api/posts`, {
      method: "POST",
      body: formData  // Send FormData directly, not JSON
    });

    if (!response.ok) {
      const errorData = await response.json();
      console.error("Error saving post:", errorData);
      return false;
    }

    return true;
  } catch (error) {
    console.error("Error saving post:", error);
    return false;
  }
}
async function getPosts(page = 1, limit = 5) {
  try {
    const res = await fetch(`https://sun-photo-be.vercel.app/api/posts?page=${page}&limit=${limit}`);
    // const res = await fetch(`http://localhost:5000/api/posts?page=${page}&limit=${limit}`);
    return await res.json();
  } catch (error) {
    console.error("Error fetching posts:", error);
    return { posts: [], total: 0 };
  }
}

window.postRegistry = window.postRegistry || new Map();

// SECTION 4: RENDER POST
function renderPost(post, container) {
  const postCard = document.createElement("div");
  postCard.className = "mb-4";
  const elementId = `post-${post._id || post.id || Math.random().toString(36).substr(2, 9)}`;

  // Store post in registry for clean downloading
  window.postRegistry.set(elementId, post);

  postCard.innerHTML = `
    <div id="${elementId}" class="bg-white rounded-2xl p-5 shadow-sm border flex flex-col md:flex-col lg:flex-row justify-between items-start md:items-center gap-6">
      
      <!-- User Info & Story Section -->
      <div class="flex gap-4 items-start flex-1">
        <!-- Profile Image -->
        <div class="w-16 h-16 md:w-20 md:h-20 rounded-full overflow-hidden bg-[#fdb44b] flex-shrink-0 flex items-center justify-center">
          ${post.profileImageUrl
      ? `<img src="${post.profileImageUrl}" crossorigin="anonymous" alt="${post.name}" class="w-full h-full object-cover" onerror="this.style.display='none'" />`
      : `<i class="fa-solid fa-user text-3xl md:text-5xl text-white"></i>`
    }
        </div>

        <!-- Text Content -->
        <div class="flex-1">
          <div class="flex flex-wrap items-center gap-2 md:gap-4 text-lg">
            <span class="font-bold text-[#3e6b4f]">${post?.name || "Anonymous"}</span>
            <span class="text-gray-400 hidden md:inline">•</span>
            <span class="text-gray-400 text-xs">${post.date}</span>
          </div>
          
          ${post.phTitle ? `<h3 class="font-semibold text-gray-800 mt-1">${post.phTitle}</h3>` : ''}

          <p class="text-sm md:text-md text-justify text-gray-600 mt-2 leading-relaxed">
            ${post.comment}
          </p>
        </div>
      </div>

      <!-- Uploaded Image & Interaction Section -->
      <div class="flex flex-col lg:flex-row items-center gap-4 self-center">
        <div class="flex flex-row lg:flex-col gap-2">
          <button onclick="downloadPostAs('${elementId}', 'jpg')" class="text-xs bg-[#e4efe6] text-[#3e6b4f] px-3 py-1.5 rounded-lg hover:bg-[#3e6b4f] hover:text-white transition shadow-sm font-semibold flex items-center">
            <i class="fa-solid fa-image mr-1.5"></i> JPG
          </button>
          <button onclick="downloadPostAs('${elementId}', 'pdf')" class="text-xs bg-[#e4efe6] text-[#3e6b4f] px-3 py-1.5 rounded-lg hover:bg-[#3e6b4f] hover:text-white transition shadow-sm font-semibold flex items-center">
            <i class="fa-solid fa-file-pdf mr-1.5"></i> PDF
          </button>
        </div>
        
        ${post.imageUrl
      ? `<div class="w-full h-full contain lg:w-48 lg:h-36 rounded-xl overflow-hidden border shadow-sm">
               <img src="${post.imageUrl}" crossorigin="anonymous" alt="${post.phTitle}" class="w-full h-full object-cover cursor-pointer hover:scale-105 transition-transform" onerror="this.style.display='none'" />
             </div>`
      : ''
    }
      </div>
    </div>
  `;

  container.appendChild(postCard);
}

// SECTION 5: DOWNLOAD LOGIC
async function downloadPostAs(elementId, format) {
  const post = window.postRegistry.get(elementId);
  if (!post) {
    showToast("Post data not found.", "error");
    return;
  }

  showToast(`Generating ${format.toUpperCase()}... Please wait.`, "success");

  // Create a hidden template with the requested Facebook-style vertical layout
  const printContainer = document.createElement("div");
  printContainer.style.position = "absolute";
  printContainer.style.left = "-9999px";
  printContainer.style.top = "-9999px";
  printContainer.style.width = "800px"; // Fixed width for high-quality consistent rendering
  printContainer.style.backgroundColor = "#ffffff";
  printContainer.style.padding = "40px";
  printContainer.style.boxSizing = "border-box";
  printContainer.style.fontFamily = "'Inter', sans-serif";

  const safeName = post.name || "Anonymous";

  printContainer.innerHTML = `
    <!-- Top: Profile Info -->
    <div style="display: flex; align-items: top; gap: 20px; margin-bottom: 24px;">
      ${post.profileImageUrl
      ? `<img src="${post.profileImageUrl}" crossorigin="anonymous" style="width: 70px; height: 70px; border-radius: 50%; object-fit: cover; border: 2px solid #e4efe6;" />`
      : `<div style="width: 70px; height: 70px; border-radius: 50%; background-color: #3e6b4f; display: flex; align-items: center; justify-content: center; color: white; font-size: 30px;"><i class="fa-solid fa-user"></i></div>`
    }
        <h2 style="margin: 0; font-size: 26px; font-weight: 600; color: #3e6b4f;">${safeName}</h2>
    </div>

    <!-- Middle: Post Content -->
    <div style="margin-bottom: 24px;">
      ${post.phTitle ? `<h3 style="margin: 0 0 12px 0; font-size: 22px; font-weight: 600; color: #1f2937;">${post.phTitle}</h3>` : ''}
      <p style="margin: 0; font-size: 17px; line-height: 1.6; color: #4b5563; text-align: justify; white-space: pre-wrap;">${post.comment}</p>
    </div>

    <!-- Bottom: Main Photo (Large/Original style) -->
    ${post.imageUrl ? `
      <div style="width: 100%; border-radius: 12px; overflow: hidden; border: 1px solid #e5e7eb; display: flex; justify-content: center; background-color: #f9fafb;">
        <img src="${post.imageUrl}" crossorigin="anonymous" style="max-width: 100%; height: auto; object-fit: contain; display: block; margin: 0 auto;" />
      </div>
    ` : ''}
  `;

  document.body.appendChild(printContainer);

  try {
    // Wait for all dynamically injected images to fully load before capturing
    const images = Array.from(printContainer.querySelectorAll('img'));
    let maxNaturalWidth = 800; // Base template width

    await Promise.all(images.map(img => new Promise((resolve) => {
      if (img.complete) {
        if (img.naturalWidth > maxNaturalWidth) maxNaturalWidth = img.naturalWidth;
        return resolve();
      }
      img.onload = () => {
        if (img.naturalWidth > maxNaturalWidth) maxNaturalWidth = img.naturalWidth;
        resolve();
      };
      img.onerror = resolve; // Continue even if one fails
    })));

    // Calculate scale to ensure 100% original quality of the largest image is maintained
    // e.g., if image is 4000px wide and template is 800px, scale will be 5, drawing it at true 4000px.
    const requiredScale = Math.max(window.devicePixelRatio * 2, maxNaturalWidth / 800);

    // Generate high quality canvas
    const canvas = await html2canvas(printContainer, {
      scale: requiredScale, // Dynamically scaled to retain original image resolution
      useCORS: true,
      backgroundColor: "#ffffff",
      logging: false
    });

    const imgData = canvas.toDataURL("image/jpeg", 1.0); // Maximum JPG quality
    const fileName = `Baxter_${safeName.replace(/\s+/g, '_')}_Post`;

    if (format === 'jpg') {
      const link = document.createElement('a');
      link.download = `${fileName}.jpg`;
      link.href = imgData;
      link.click();
    } else if (format === 'pdf') {
      const { jsPDF } = window.jspdf;
      const pdf = new jsPDF({
        orientation: canvas.width > canvas.height ? 'landscape' : 'portrait',
        unit: 'px',
        format: [canvas.width, canvas.height]
      });
      pdf.addImage(imgData, 'JPEG', 0, 0, canvas.width, canvas.height);
      pdf.save(`${fileName}.pdf`);
    }

    showToast(`Successfully downloaded as ${format.toUpperCase()}!`, "success");
  } catch (error) {
    console.error("Error generating download:", error);
    showToast("Failed to download post.", "error");
  } finally {
    // Clean up hidden template
    document.body.removeChild(printContainer);
  }
}