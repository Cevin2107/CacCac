import './style.css';

// State variables
let projects = [];
let selectedCountry = 'all';

const refreshListBtn = document.getElementById('refresh-list-btn');
const totalLinksCount = document.getElementById('total-links-count');
const rateLimitText = document.getElementById('rate-limit-text');
const rateLimitBar = document.getElementById('rate-limit-bar');

const countryFilter = document.getElementById('country-filter');
const listLoading = document.getElementById('list-loading');
const listEmpty = document.getElementById('list-empty');
const projectsGrid = document.getElementById('projects-grid');

const resultModal = document.getElementById('result-modal');
const closeModalBtn = document.getElementById('close-modal-btn');
const closeModalSecondaryBtn = document.getElementById('close-modal-secondary-btn');
const copyLinkBtn = document.getElementById('copy-link-btn');
const openNetflixBtn = document.getElementById('open-netflix-btn');
const modalProjectLabel = document.getElementById('modal-project-label');
const modalProjectPlan = document.getElementById('modal-project-plan');
const claimedLinkUrl = document.getElementById('claimed-link-url');

const toastContainer = document.getElementById('toast-container');

// Active Link Panel Elements
const activeLinkPanel = document.getElementById('active-link-panel');
const activeLinkBadge = document.getElementById('active-link-badge');
const activeLinkUrl = document.getElementById('active-link-url');
const activeCopyBtn = document.getElementById('active-copy-btn');
const activeOpenBtn = document.getElementById('active-open-btn');
const releaseLinkBtn = document.getElementById('release-link-btn');

// Tutorial Modal Elements
const tutorialModal = document.getElementById('tutorial-modal');
const tutorialBtn = document.getElementById('tutorial-btn');
const closeTutorialBtn = document.getElementById('close-tutorial-btn');
const closeTutorialSecondaryBtn = document.getElementById('close-tutorial-secondary-btn');
const tabButtons = document.querySelectorAll('.tab-btn');
const tabContents = document.querySelectorAll('.tab-content');

// TV Login Elements
const navBtnLinks = document.getElementById('nav-btn-links');
const navBtnTv = document.getElementById('nav-btn-tv');
const viewLinks = document.getElementById('view-links');
const viewTv = document.getElementById('view-tv');
const tvCodeInput = document.getElementById('tv-code-input');
const submitTvLoginBtn = document.getElementById('submit-tv-login-btn');

// Toast notification helper
function showToast(message, type = 'info') {
  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;
  
  let iconClass = 'fa-circle-info';
  if (type === 'success') iconClass = 'fa-circle-check';
  if (type === 'error') iconClass = 'fa-circle-exclamation';
  if (type === 'warning') iconClass = 'fa-triangle-exclamation';

  toast.innerHTML = `
    <i class="fa-solid ${iconClass} toast-icon"></i>
    <span class="toast-message">${message}</span>
  `;
  
  toastContainer.appendChild(toast);
  
  // Animate slide-in and out
  setTimeout(() => {
    toast.style.animation = 'slideIn 0.3s reverse forwards';
    setTimeout(() => {
      toast.remove();
    }, 300);
  }, 4000);
}

// Fetch available projects from backend API
async function fetchProjects(isManual = false) {
  // Update loading states
  listLoading.classList.remove('hidden');
  listEmpty.classList.add('hidden');
  projectsGrid.innerHTML = '';

  try {
    const response = await fetch('/api/netflix-free/links');

    if (response.status === 401) {
      throw new Error('Token không hợp lệ hoặc đã hết hạn. Vui lòng cấu hình lại.');
    }

    if (!response.ok) {
      throw new Error(`Lỗi hệ thống: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    
    if (data.success && Array.isArray(data.links)) {
      projects = data.links;
      
      // Update UI Stats
      totalLinksCount.textContent = projects.length;
      const rateUsed = data.rate_used ?? 0;
      const rateMax = data.rate_max ?? 4;
      rateLimitText.textContent = `${rateUsed} / ${rateMax}`;
      
      // Calculate limit progress bar
      const percentage = (rateUsed / rateMax) * 100;
      rateLimitBar.style.width = `${Math.min(percentage, 100)}%`;
      if (percentage >= 100) {
        rateLimitBar.style.background = 'var(--color-danger)';
      } else if (percentage >= 75) {
        rateLimitBar.style.background = 'var(--color-warning)';
      } else {
        rateLimitBar.style.background = 'linear-gradient(90deg, var(--color-primary), var(--color-purple))';
      }

      // Update Filter Options
      updateCountryFilter();

      // Render the accounts grid
      renderProjects();
      
      // Parse active assignments (claimed links)
      handleActiveAssignments(data.my_assignments);
      
      if (isManual) {
        showToast('Đã đồng bộ danh sách tài khoản mới nhất.', 'success');
      }
    } else {
      throw new Error(data.error || 'Định dạng dữ liệu trả về không đúng.');
    }
  } catch (error) {
    console.error('Fetch links error:', error);
    listEmpty.classList.remove('hidden');
    showToast(error.message, 'error');
  } finally {
    listLoading.classList.add('hidden');
  }
}

// Populate the country filter dropdown dynamically
function updateCountryFilter() {
  const countries = new Set(projects.map(p => p.country).filter(Boolean));
  
  // Clear previous dynamic options
  countryFilter.innerHTML = '<option value="all">Tất cả quốc gia</option>';
  
  countries.forEach(country => {
    const option = document.createElement('option');
    option.value = country;
    option.textContent = country === 'VN' ? 'Việt Nam (VN)' : country;
    countryFilter.appendChild(option);
  });

  countryFilter.value = selectedCountry;
}

// Render filtered project cards to UI
function renderProjects() {
  projectsGrid.innerHTML = '';

  const filtered = selectedCountry === 'all' 
    ? projects 
    : projects.filter(p => p.country === selectedCountry);

  if (filtered.length === 0) {
    listEmpty.classList.remove('hidden');
    return;
  }

  listEmpty.classList.add('hidden');

  filtered.forEach(project => {
    const card = document.createElement('div');
    card.className = 'project-card';
    
    // Quality format
    const quality = project.video_quality || 'UHD';
    const isUhd = quality.toLowerCase().includes('uhd') || quality.toLowerCase().includes('4k');
    const isExpired = project.expired;

    // Stream info
    const activeStreams = project.active_count ?? 0;
    const maxStreams = project.max_streams ?? 4;
    
    // Status text
    let statusBadge = `<span class="badge bg-primary">Hoạt động</span>`;
    if (isExpired) {
      statusBadge = `<span class="badge bg-red">Hết hạn</span>`;
    } else if (project.health_error) {
      statusBadge = `<span class="badge bg-orange">Lỗi kết nối</span>`;
    }

    card.innerHTML = `
      <div class="card-header">
        <div class="card-title-group">
          <h3>${project.label || `Link #${project.id}`}</h3>
          <div class="card-sub">${project.email || 'N/A'}</div>
        </div>
        <div class="badge-group">
          ${statusBadge}
          <span class="badge bg-purple">${isUhd ? 'Premium (UHD)' : 'Standard (HD)'}</span>
        </div>
      </div>
      
      <div class="card-details">
        <div class="detail-row">
          <span class="detail-label">Vùng quốc gia:</span>
          <span class="detail-val">${project.country || 'VN'}</span>
        </div>
        <div class="detail-row">
          <span class="detail-label">Số Profile:</span>
          <span class="detail-val">${project.profile_count ?? 5} profile</span>
        </div>
        <div class="detail-row">
          <span class="detail-label">Số luồng hoạt động:</span>
          <span class="detail-val">${activeStreams} / ${maxStreams}</span>
        </div>
        <div class="detail-row">
          <span class="detail-label">Hạn thanh toán:</span>
          <span class="detail-val">${project.next_billing || 'N/A'}</span>
        </div>
      </div>
      
      ${project.health_error ? `
        <div class="card-health-error">
          <i class="fa-solid fa-triangle-exclamation"></i>
          <span>${project.health_error}</span>
        </div>
      ` : ''}
      
      <button class="btn btn-claim" ${isExpired ? 'disabled' : ''} data-id="${project.id}">
        <i class="fa-solid fa-circle-plus"></i> Tạo Link
      </button>
    `;

    // Add click event for claiming
    const claimBtn = card.querySelector('.btn-claim');
    claimBtn.addEventListener('click', () => claimProject(project.id, claimBtn, project));

    projectsGrid.appendChild(card);
  });
}

// Trigger POST claim API to request a login session link
async function claimProject(projectId, buttonEl, projectInfo) {
  if (!token) {
    showToast('Vui lòng cấu hình token trước.', 'warning');
    return;
  }

  // Set loading state for button
  const originalHtml = buttonEl.innerHTML;
  buttonEl.disabled = true;
  buttonEl.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Đang tạo...';

  try {
    const response = await fetch('/api/netflix-free/claim', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ cookie_id: projectId })
    });

    if (response.status === 401) {
      throw new Error('Token ủy quyền hết hạn hoặc không hợp lệ.');
    }

    const data = await response.json();

    if (response.ok && data.success) {
      // Success modal pop up
      modalProjectLabel.textContent = projectInfo.label || `Link #${projectId}`;
      modalProjectPlan.textContent = projectInfo.plan || 'Premium';
      
      // Determine what link format was returned
      let resultLink = '';
      if (data.token) {
        resultLink = `https://friendshouse.io.vn/api/netflix-free/open?token=${data.token}`;
      } else if (data.open_url) {
        const cleanPath = data.open_url.replace('/api/v1/netflix-free', '/api/netflix-free');
        resultLink = `https://friendshouse.io.vn${cleanPath}`;
      } else {
        resultLink = `https://friendshouse.io.vn/api/netflix-free/redirect?id=${projectId}`;
      }
      claimedLinkUrl.value = resultLink;
      openNetflixBtn.href = resultLink;
      
      resultModal.classList.remove('hidden');
      showToast('Khởi tạo liên kết thành công!', 'success');
      
      // Refresh project list in the background
      fetchProjects(false);
    } else {
      // Display failure message returned by the server
      const errMsg = data.error || data.message || 'Không thể tạo link tại thời điểm này. Link có thể đang bận!';
      showToast(errMsg, 'error');
    }
  } catch (error) {
    console.error('Claim project error:', error);
    showToast(error.message || 'Lỗi mạng khi kết nối máy chủ.', 'error');
  } finally {
    // Restore button state
    buttonEl.disabled = false;
    buttonEl.innerHTML = originalHtml;
  }
}

// Copy link to clipboard
function copyToClipboard() {
  claimedLinkUrl.select();
  claimedLinkUrl.setSelectionRange(0, 99999); // For mobile devices
  
  navigator.clipboard.writeText(claimedLinkUrl.value)
    .then(() => {
      const originalText = copyLinkBtn.innerHTML;
      copyLinkBtn.innerHTML = '<i class="fa-solid fa-check"></i> Copied!';
      copyLinkBtn.style.background = 'var(--color-primary-hover)';
      showToast('Đã sao chép liên kết đăng nhập vào clipboard.', 'success');
      
      setTimeout(() => {
        copyLinkBtn.innerHTML = originalText;
        copyLinkBtn.style.background = '';
      }, 2000);
    })
    .catch(err => {
      console.error('Copy failure:', err);
      showToast('Không thể tự động sao chép. Vui lòng copy thủ công.', 'warning');
    });
}

// Bind Page Events
function bindEvents() {

  // Refresh Grid
  refreshListBtn.addEventListener('click', () => fetchProjects(true));

  // Country Filter Change
  countryFilter.addEventListener('change', (e) => {
    selectedCountry = e.target.value;
    renderProjects();
  });

  // Close Claim Modal
  const closeModal = () => resultModal.classList.add('hidden');
  closeModalBtn.addEventListener('click', closeModal);
  closeModalSecondaryBtn.addEventListener('click', closeModal);
  resultModal.addEventListener('click', (e) => {
    if (e.target === resultModal) closeModal();
  });

  // Copy Link button click
  copyLinkBtn.addEventListener('click', copyToClipboard);

  // Copy Active Link button click
  activeCopyBtn.addEventListener('click', () => {
    activeLinkUrl.select();
    activeLinkUrl.setSelectionRange(0, 99999);
    navigator.clipboard.writeText(activeLinkUrl.value)
      .then(() => {
        const originalHtml = activeCopyBtn.innerHTML;
        activeCopyBtn.innerHTML = '<i class="fa-solid fa-check"></i> Copied!';
        showToast('Đã sao chép liên kết hoạt động.', 'success');
        setTimeout(() => { activeCopyBtn.innerHTML = originalHtml; }, 2000);
      })
      .catch(() => showToast('Không thể tự động sao chép.', 'warning'));
  });

  // Release Active Link button click
  releaseLinkBtn.addEventListener('click', releaseActiveLink);

  // Open Tutorial Modal
  tutorialBtn.addEventListener('click', () => {
    tutorialModal.classList.remove('hidden');
  });

  // Close Tutorial Modal
  const closeTutorial = () => tutorialModal.classList.add('hidden');
  closeTutorialBtn.addEventListener('click', closeTutorial);
  closeTutorialSecondaryBtn.addEventListener('click', closeTutorial);
  tutorialModal.addEventListener('click', (e) => {
    if (e.target === tutorialModal) closeTutorial();
  });

  // Tab switching logic for tutorial
  tabButtons.forEach(btn => {
    btn.addEventListener('click', () => {
      // Remove active class from all buttons and contents
      tabButtons.forEach(tb => tb.classList.remove('active'));
      tabContents.forEach(tc => tc.classList.remove('active'));

      // Add active class to clicked button
      btn.classList.add('active');

      // Add active class to corresponding content panel
      const targetTab = btn.getAttribute('data-tab');
      const targetContent = document.getElementById(`tab-${targetTab}`);
      if (targetContent) {
        targetContent.classList.add('active');
      }
    });
  });

  // View Panel Navigation Toggle
  navBtnLinks.addEventListener('click', () => {
    navBtnLinks.classList.add('active');
    navBtnTv.classList.remove('active');
    viewLinks.classList.remove('hidden');
    viewTv.classList.add('hidden');
  });

  navBtnTv.addEventListener('click', () => {
    navBtnTv.classList.add('active');
    navBtnLinks.classList.remove('active');
    viewTv.classList.remove('hidden');
    viewLinks.classList.add('hidden');
  });

  // Auto format TV Code input: 0000-0000
  tvCodeInput.addEventListener('input', (e) => {
    let value = e.target.value.replace(/\D/g, '');
    if (value.length > 4) {
      value = value.slice(0, 4) + '-' + value.slice(4, 8);
    }
    e.target.value = value;
  });

  // Submit TV Login activation
  submitTvLoginBtn.addEventListener('click', submitTvLogin);
  tvCodeInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') submitTvLogin();
  });
}

// Handle Active Assignments UI State
function handleActiveAssignments(assignments) {
  if (Array.isArray(assignments) && assignments.length > 0) {
    const active = assignments[0];
    const cookieId = active.cookie_id;
    const activeToken = active.token;
    
    if (activeToken) {
      const url = `https://friendshouse.io.vn/api/netflix-free/open?token=${activeToken}`;
      activeLinkUrl.value = url;
      activeOpenBtn.href = url;
      
      const matched = projects.find(p => p.id === cookieId);
      activeLinkBadge.textContent = matched ? (matched.label || `Link #${cookieId}`) : `Link #${cookieId}`;
      
      releaseLinkBtn.setAttribute('data-token', activeToken);
      activeLinkPanel.classList.remove('hidden');
      
      // Disable all "Tạo link" buttons on the list grid
      document.querySelectorAll('.btn-claim').forEach(btn => {
        btn.disabled = true;
      });
      return;
    }
  }
  
  // Hide panel if no active links
  activeLinkPanel.classList.add('hidden');
  
  // Re-enable claim buttons
  document.querySelectorAll('.btn-claim').forEach(btn => {
    const id = parseInt(btn.getAttribute('data-id'));
    const proj = projects.find(p => p.id === id);
    if (proj && !proj.expired) {
      btn.disabled = false;
    }
  });
}

// Release active claimed link
async function releaseActiveLink() {
  const linkToken = releaseLinkBtn.getAttribute('data-token');
  if (!linkToken) {
    showToast('Không có link hoạt động để trả.', 'warning');
    return;
  }

  const originalHtml = releaseLinkBtn.innerHTML;
  releaseLinkBtn.disabled = true;
  releaseLinkBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Đang giải phóng...';

  try {
    const response = await fetch('/api/netflix-free/release', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ token: linkToken })
    });

    if (response.status === 401) {
      throw new Error('Token đăng nhập hết hạn hoặc không hợp lệ.');
    }

    const data = await response.json();

    if (response.ok && data.success) {
      showToast('Đã trả link và giải phóng lượt thành công!', 'success');
      activeLinkPanel.classList.add('hidden');
      // Refresh list
      await fetchProjects(false);
    } else {
      const errMsg = data.error || data.message || 'Không thể giải phóng link. Vui lòng thử lại!';
      showToast(errMsg, 'error');
    }
  } catch (error) {
    console.error('Release link error:', error);
    showToast(error.message || 'Lỗi kết nối máy chủ khi trả link.', 'error');
  } finally {
    releaseLinkBtn.disabled = false;
    releaseLinkBtn.innerHTML = originalHtml;
  }
}

// App Initialization
function init() {
  bindEvents();
  fetchProjects(false);
}

// Submit Smart TV Activation code
async function submitTvLogin() {
  const codeValue = tvCodeInput.value.trim();
  const cleanCode = codeValue.replace(/-/g, '');

  if (cleanCode.length !== 8) {
    showToast('Mã kích hoạt Tivi phải có đúng 8 chữ số.', 'warning');
    return;
  }

  const originalHtml = submitTvLoginBtn.innerHTML;
  submitTvLoginBtn.disabled = true;
  submitTvLoginBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Đang kích hoạt...';

  try {
    const response = await fetch('/api/external/tv-login', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ code: cleanCode })
    });

    const data = await response.json();

    if (response.ok && data.success) {
      showToast('Kích hoạt đăng nhập Smart TV thành công!', 'success');
      tvCodeInput.value = '';
    } else {
      const errMsg = data.error || data.message || 'Kích hoạt thất bại. Vui lòng kiểm tra lại mã!';
      showToast(errMsg, 'error');
    }
  } catch (error) {
    console.error('TV login error:', error);
    showToast(error.message || 'Lỗi kết nối máy chủ TV login.', 'error');
  } finally {
    submitTvLoginBtn.disabled = false;
    submitTvLoginBtn.innerHTML = originalHtml;
  }
}

// Start App when page content loaded
document.addEventListener('DOMContentLoaded', init);
