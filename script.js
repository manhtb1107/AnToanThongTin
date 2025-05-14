let processedLines = [];
let originalFileName = '';
let originalContent = '';

document.getElementById('des-form').addEventListener('submit', async (e) => {
    e.preventDefault();

    // Lấy dữ liệu từ form
    const fileInput = document.getElementById('file');
    const textInput = document.getElementById('text-input');
    const inputMethod = document.querySelector('input[name="input-method"]:checked').value;
    const key = document.getElementById('key').value;
    const action = document.querySelector('input[name="action"]:checked').value;
    const errorMessage = document.getElementById('error-message');
    const resultSection = document.getElementById('result-section');
    const beforeContent = document.getElementById('before-content');
    const afterContent = document.getElementById('after-content');
    const downloadNameInput = document.getElementById('download-name');

    // Hiển thị thông báo lỗi nếu cần
    const showError = (message) => {
        errorMessage.textContent = message;
        errorMessage.classList.remove('hidden');
        resultSection.classList.add('hidden');
    };

    // Xóa thông báo lỗi
    errorMessage.classList.add('hidden');
    resultSection.classList.add('hidden');

    // Kiểm tra khóa (phải đúng 8 ký tự)
    if (key.length !== 8) {
        showError('Khóa phải có đúng 8 ký tự!');
        return;
    }

    let lines = [];
    originalFileName = 'output'; // Tên mặc định nếu nhập trực tiếp

    // Xử lý nhập liệu
    if (inputMethod === 'file') {
        // Kiểm tra file
        if (!fileInput.files[0]) {
            showError('Vui lòng chọn file!');
            return;
        }

        const file = fileInput.files[0];
        if (!file.name.endsWith('.txt')) {
            showError('Chỉ hỗ trợ file .txt!');
            return;
        }

        originalFileName = file.name;
        const reader = new FileReader();

        reader.onload = async (event) => {
            originalContent = event.target.result;
            lines = originalContent.split(/\r?\n/); // Chia file thành từng dòng
            processLines(lines, key, action, showError, resultSection, beforeContent, afterContent, downloadNameInput, originalContent, originalFileName);
        };

        reader.readAsText(file);
    } else {
        // Nhập trực tiếp
        originalContent = textInput.value;
        if (!originalContent.trim()) {
            showError('Vui lòng nhập nội dung!');
            return;
        }

        lines = originalContent.split(/\n/); // Chia textarea thành từng dòng
        processLines(lines, key, action, showError, resultSection, beforeContent, afterContent, downloadNameInput, originalContent, originalFileName);
    }
});

// Xử lý các dòng
function processLines(lines, key, action, showError, resultSection, beforeContent, afterContent, downloadNameInput, originalContent, originalFileName) {
    processedLines = [];

    // Xử lý từng dòng
    for (let line of lines) {
        if (line.trim() === '') continue; // Bỏ qua dòng trống

        if (action === 'encrypt') {
            // Mã hóa từng dòng
            try {
                const encryptedLine = CryptoJS.DES.encrypt(
                    line,
                    key,
                    { mode: CryptoJS.mode.ECB, padding: CryptoJS.pad.Pkcs7 }
                ).toString();
                processedLines.push(encryptedLine);
            } catch (err) {
                showError('Lỗi khi mã hóa dòng: ' + err.message);
                return;
            }
        } else {
            // Giải mã từng dòng
            try {
                const decrypted = CryptoJS.DES.decrypt(
                    line,
                    key,
                    { mode: CryptoJS.mode.ECB, padding: CryptoJS.pad.Pkcs7 }
                );
                const decryptedLine = decrypted.toString(CryptoJS.enc.Utf8);
                if (!decryptedLine) {
                    showError('Không thể giải mã dòng! Kiểm tra khóa hoặc nội dung.');
                    return;
                }
                processedLines.push(decryptedLine);
            } catch (err) {
                showError('Lỗi khi giải mã dòng: ' + err.message);
                return;
            }
        }
    }

    // Hiển thị kết quả
    resultSection.classList.remove('hidden');
    beforeContent.textContent = originalContent.slice(0, 500) + (originalContent.length > 500 ? '...' : '');
    afterContent.textContent = processedLines.join('\n').slice(0, 500) + (processedLines.join('\n').length > 500 ? '...' : '');
    
    // Đặt tên file mặc định
    downloadNameInput.value = action === 'encrypt' ? `encrypted_${originalFileName.split('.')[0]}` : `decrypted_${originalFileName.split('.')[0]}`;
}

// Xử lý chuyển đổi phương thức nhập liệu
document.querySelectorAll('input[name="input-method"]').forEach((radio) => {
    radio.addEventListener('change', (e) => {
        const fileInputSection = document.getElementById('file-input-section');
        const textInputSection = document.getElementById('text-input-section');
        if (e.target.value === 'file') {
            fileInputSection.classList.remove('hidden');
            textInputSection.classList.add('hidden');
            document.getElementById('file').required = true;
            document.getElementById('text-input').required = false;
        } else {
            fileInputSection.classList.add('hidden');
            textInputSection.classList.remove('hidden');
            document.getElementById('file').required = false;
            document.getElementById('text-input').required = true;
        }
    });
});

// Xử lý tải file
document.getElementById('download-btn').addEventListener('click', () => {
    const downloadName = document.getElementById('download-name').value.trim();
    if (processedLines.length === 0) {
        document.getElementById('error-message').textContent = 'Chưa có dữ liệu để tải!';
        document.getElementById('error-message').classList.remove('hidden');
        return;
    }

    if (!downloadName) {
        document.getElementById('error-message').textContent = 'Vui lòng nhập tên file!';
        document.getElementById('error-message').classList.remove('hidden');
        return;
    }

    // Tạo file để tải về
    const processedContent = processedLines.join('\n');
    const blob = new Blob([processedContent], { type: 'text/plain' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${downloadName}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
});