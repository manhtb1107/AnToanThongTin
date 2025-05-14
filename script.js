let processedData = [];
let originalFileName = '';
let originalContent = '';
let processedLines = [];

document.getElementById('des-form').addEventListener('submit', async (e) => {
    e.preventDefault();

    // Lấy dữ liệu từ form
    const fileInput = document.getElementById('file');
    const textInput = document.getElementById('text-input');
    const imageInput = document.getElementById('image');
    const imagesInput = document.getElementById('images');
    const inputMethod = document.querySelector('input[name="input-method"]:checked').value;
    let key = document.getElementById('key').value;
    const action = document.querySelector('input[name="action"]:checked').value;
    const errorMessage = document.getElementById('error-message');
    const resultSection = document.getElementById('result-section');
    const beforeContent = document.getElementById('before-content');
    const afterContent = document.getElementById('after-content');
    const resultMessage = document.getElementById('result-message');
    const downloadNameInput = document.getElementById('download-name');
    const downloadBtn = document.getElementById('download-btn');
    const downloadLinks = document.getElementById('download-links');

    // Hiển thị thông báo lỗi nếu cần
    const showError = (message) => {
        errorMessage.textContent = message;
        errorMessage.classList.remove('hidden');
        resultSection.classList.add('hidden');
    };

    // Xóa thông báo lỗi
    errorMessage.classList.add('hidden');
    resultSection.classList.add('hidden');
    beforeContent.classList.add('hidden');
    afterContent.classList.add('hidden');
    resultMessage.classList.remove('hidden');
    downloadNameInput.classList.add('hidden');
    downloadBtn.classList.add('hidden');
    downloadLinks.classList.add('hidden');
    downloadLinks.innerHTML = '';
    processedData = [];

    // Kiểm tra khóa (không rỗng)
    if (!key.trim()) {
        showError('Vui lòng nhập khóa!');
        return;
    }

    // Xử lý khóa để phù hợp với DES (64-bit)
    key = adjustKeyForDES(key);

    let lines = [];
    originalFileName = 'output';

    // Xử lý nhập liệu
    if (inputMethod === 'file') {
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
            lines = originalContent.split(/\r?\n/);
            processText(lines, key, action, showError, resultSection, beforeContent, afterContent, resultMessage, downloadNameInput, downloadBtn, downloadLinks, originalContent, originalFileName);
        };
        reader.readAsText(file);
    } else if (inputMethod === 'text') {
        originalContent = textInput.value;
        if (!originalContent.trim()) {
            showError('Vui lòng nhập nội dung!');
            return;
        }
        lines = originalContent.split(/\n/);
        processText(lines, key, action, showError, resultSection, beforeContent, afterContent, resultMessage, downloadNameInput, downloadBtn, downloadLinks, originalContent, originalFileName);
    } else if (inputMethod === 'image') {
        if (!imageInput.files[0]) {
            showError('Vui lòng chọn hình ảnh!');
            return;
        }
        const file = imageInput.files[0];
        const validExtensions = ['.jpg', '.jpeg', '.png'];
        if (!validExtensions.some(ext => file.name.toLowerCase().endsWith(ext))) {
            showError('Chỉ hỗ trợ định dạng .jpg, .jpeg, .png!');
            return;
        }
        originalFileName = file.name;
        const reader = new FileReader();
        reader.onload = async (event) => {
            const arrayBuffer = event.target.result;
            const uint8Array = new Uint8Array(arrayBuffer);
            processImage([uint8Array], [originalFileName], key, action, showError, resultSection, resultMessage, downloadNameInput, downloadBtn, downloadLinks);
        };
        reader.readAsArrayBuffer(file);
    } else if (inputMethod === 'images') {
        if (!imagesInput.files.length) {
            showError('Vui lòng chọn ít nhất một hình ảnh!');
            return;
        }
        const files = Array.from(imagesInput.files);
        const validExtensions = ['.jpg', '.jpeg', '.png'];
        for (let file of files) {
            if (!validExtensions.some(ext => file.name.toLowerCase().endsWith(ext))) {
                showError(`File ${file.name} không hợp lệ! Chỉ hỗ trợ .jpg, .jpeg, .png!`);
                return;
            }
        }
        const fileNames = files.map(file => file.name);
        const readers = files.map(file => {
            const reader = new FileReader();
            return new Promise((resolve) => {
                reader.onload = (event) => resolve(new Uint8Array(event.target.result));
                reader.readAsArrayBuffer(file);
            });
        });
        const uint8Arrays = await Promise.all(readers);
        processImage(uint8Arrays, fileNames, key, action, showError, resultSection, resultMessage, downloadNameInput, downloadBtn, downloadLinks);
    }
});

// Xử lý khóa để phù hợp với DES (64-bit)
function adjustKeyForDES(key) {
    const keyBytes = CryptoJS.enc.Utf8.parse(key);
    let keyString = keyBytes.toString(CryptoJS.enc.Utf8);
    if (keyString.length < 8) {
        // Đệm bằng ký tự 0 nếu khóa ngắn hơn 8 byte
        keyString = keyString.padEnd(8, '\0');
    } else if (keyString.length > 8) {
        // Cắt nếu khóa dài hơn 8 byte
        keyString = keyString.substring(0, 8);
    }
    return keyString;
}

// Xử lý văn bản
function processText(lines, key, action, showError, resultSection, beforeContent, afterContent, resultMessage, downloadNameInput, downloadBtn, downloadLinks, originalContent, originalFileName) {
    processedLines = [];

    for (let line of lines) {
        if (line.trim() === '') continue;

        if (action === 'encrypt') {
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

    resultSection.classList.remove('hidden');
    beforeContent.classList.remove('hidden');
    afterContent.classList.remove('hidden');
    resultMessage.classList.add('hidden');
    downloadNameInput.classList.remove('hidden');
    downloadBtn.classList.remove('hidden');
    downloadLinks.classList.add('hidden');
    beforeContent.textContent = originalContent.slice(0, 500) + (originalContent.length > 500 ? '...' : '');
    afterContent.textContent = processedLines.join('\n').slice(0, 500) + (processedLines.join('\n').length > 500 ? '...' : '');
    downloadNameInput.value = action === 'encrypt' ? `encrypted_${originalFileName.split('.')[0]}` : `decrypted_${originalFileName.split('.')[0]}`;
}

// Xử lý hình ảnh
function processImage(uint8Arrays, fileNames, key, action, showError, resultSection, resultMessage, downloadNameInput, downloadBtn, downloadLinks) {
    processedData = [];

    for (let i = 0; i < uint8Arrays.length; i++) {
        const uint8Array = uint8Arrays[i];
        const wordArray = CryptoJS.lib.WordArray.create(uint8Array);
        let processed = null;

        if (action === 'encrypt') {
            try {
                processed = CryptoJS.DES.encrypt(
                    wordArray,
                    key,
                    { mode: CryptoJS.mode.ECB, padding: CryptoJS.pad.Pkcs7 }
                ).toString(CryptoJS.enc.Base64);
                const binaryData = atob(processed.replace(/\n/g, ''));
                const byteArray = new Uint8Array(binaryData.length);
                for (let j = 0; j < binaryData.length; j++) {
                    byteArray[j] = binaryData.charCodeAt(j);
                }
                processedData.push({ data: byteArray, name: fileNames[i] });
            } catch (err) {
                showError(`Lỗi khi mã hóa hình ảnh ${fileNames[i]}: ${err.message}`);
                return;
            }
        } else {
            try {
                const wordArrayFromBase64 = CryptoJS.enc.Base64.parse(uint8Array);
                const decrypted = CryptoJS.DES.decrypt(
                    { ciphertext: wordArrayFromBase64 },
                    key,
                    { mode: CryptoJS.mode.ECB, padding: CryptoJS.pad.Pkcs7 }
                );
                processed = decrypted.toString(CryptoJS.enc.Latin1);
                const binaryData = atob(processed.replace(/\n/g, ''));
                const byteArray = new Uint8Array(binaryData.length);
                for (let j = 0; j < binaryData.length; j++) {
                    byteArray[j] = binaryData.charCodeAt(j);
                }
                processedData.push({ data: byteArray, name: fileNames[i] });
            } catch (err) {
                showError(`Lỗi khi giải mã hình ảnh ${fileNames[i]}: ${err.message}`);
                return;
            }
        }
    }

    resultSection.classList.remove('hidden');
    resultMessage.textContent = `Đã ${action === 'encrypt' ? 'mã hóa' : 'giải mã'} ${processedData.length} hình ảnh thành công!`;
    downloadNameInput.classList.add('hidden');
    downloadBtn.classList.add('hidden');
    downloadLinks.classList.remove('hidden');

    processedData.forEach((item, index) => {
        const extension = item.name.split('.').pop().toLowerCase();
        const baseName = action === 'encrypt' ? `encrypted_${item.name.split('.')[0]}` : `decrypted_${item.name.split('.')[0]}`;
        const blob = new Blob([item.data], { type: 'image/' + extension });
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `${baseName}.${extension}`;
        link.textContent = `Tải ${baseName}.${extension}`;
        link.onclick = () => setTimeout(() => window.URL.revokeObjectURL(url), 100);
        downloadLinks.appendChild(link);
    });
}

// Xử lý chuyển đổi phương thức nhập liệu
document.querySelectorAll('input[name="input-method"]').forEach((radio) => {
    radio.addEventListener('change', (e) => {
        const fileInputSection = document.getElementById('file-input-section');
        const textInputSection = document.getElementById('text-input-section');
        const imageInputSection = document.getElementById('image-input-section');
        const imagesInputSection = document.getElementById('images-input-section');
        if (e.target.value === 'file') {
            fileInputSection.classList.remove('hidden');
            textInputSection.classList.add('hidden');
            imageInputSection.classList.add('hidden');
            imagesInputSection.classList.add('hidden');
            document.getElementById('file').required = true;
            document.getElementById('text-input').required = false;
            document.getElementById('image').required = false;
            document.getElementById('images').required = false;
        } else if (e.target.value === 'text') {
            fileInputSection.classList.add('hidden');
            textInputSection.classList.remove('hidden');
            imageInputSection.classList.add('hidden');
            imagesInputSection.classList.add('hidden');
            document.getElementById('file').required = false;
            document.getElementById('text-input').required = true;
            document.getElementById('image').required = false;
            document.getElementById('images').required = false;
        } else if (e.target.value === 'image') {
            fileInputSection.classList.add('hidden');
            textInputSection.classList.add('hidden');
            imageInputSection.classList.remove('hidden');
            imagesInputSection.classList.add('hidden');
            document.getElementById('file').required = false;
            document.getElementById('text-input').required = false;
            document.getElementById('image').required = true;
            document.getElementById('images').required = false;
        } else {
            fileInputSection.classList.add('hidden');
            textInputSection.classList.add('hidden');
            imageInputSection.classList.add('hidden');
            imagesInputSection.classList.remove('hidden');
            document.getElementById('file').required = false;
            document.getElementById('text-input').required = false;
            document.getElementById('image').required = false;
            document.getElementById('images').required = true;
        }
    });
});

// Xử lý tải file (cho văn bản)
document.getElementById('download-btn').addEventListener('click', () => {
    const downloadName = document.getElementById('download-name').value.trim();
    if (!processedLines.length) {
        document.getElementById('error-message').textContent = 'Chưa có dữ liệu để tải!';
        document.getElementById('error-message').classList.remove('hidden');
        return;
    }

    if (!downloadName) {
        document.getElementById('error-message').textContent = 'Vui lòng nhập tên file!';
        document.getElementById('error-message').classList.remove('hidden');
        return;
    }

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