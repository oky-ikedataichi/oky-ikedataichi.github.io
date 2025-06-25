let panorama;
let map;
let streetViewService;
let guessMarker = null;
let actualMarker = null;
let polyline = null;
let actualLocation = null;

// ゲームの初期化
function initGame() {
    streetViewService = new google.maps.StreetViewService();

    panorama = new google.maps.StreetViewPanorama(
        document.getElementById('pano'), {
        // ストリートビューの初期設定（任意）
        disableDefaultUI: true, // デフォルトUIを無効にする（カスタムUIを作る場合）
        showRoadLabels: false,
        linksControl: false,
        panControl: true,
        zoomControl: true,
        enableCloseButton: false,
    }
    );

    map = new google.maps.Map(document.getElementById('map'), {
        center: { lat: 0, lng: 0 }, // 初期は世界全体を表示
        zoom: 1,
        streetViewControl: false, // 地図からストリートビューへのアクセスボタンを非表示
        mapTypeControl: false, // 地図タイプ切り替えを非表示
        fullscreenControl: false, // フルスクリーンボタンを非表示
    });

    // 地図クリックイベントリスナー
    map.addListener('click', function (e) {
        if (actualLocation) { // ゲームが始まっている場合のみ推測を許可
            placeGuessMarker(e.latLng);
        }
    });

    // ボタンイベントリスナー
    document.getElementById('guessButton').addEventListener('click', calculateResult);
    document.getElementById('nextRoundButton').addEventListener('click', startNewRound);

    startNewRound(); // ゲーム開始時に最初のラウンドを開始
}

// 新しいラウンドを開始
function startNewRound() {
    clearMarkersAndLines();
    document.getElementById('result').textContent = '';
    document.getElementById('guessButton').disabled = true;
    document.getElementById('nextRoundButton').disabled = true;
    actualLocation = null;

    findRandomStreetViewLocation();
}

// ランダムなストリートビューの場所を見つける
function findRandomStreetViewLocation() {
    const maxAttempts = 100; // 試行回数制限
    let attempts = 0;

    const tryFindLocation = () => {
        attempts++;
        if (attempts > maxAttempts) {
            document.getElementById('result').textContent = 'ストリートビューが見つかりませんでした。再試行してください。';
            document.getElementById('nextRoundButton').disabled = false;
            return;
        }

        // ランダムな緯度経度を生成
        // 世界全体を対象とする場合
        const lat = Math.random() * 170 - 85; // -85 から 85 まで (極地を除く)
        const lng = Math.random() * 360 - 180; // -180 から 180 まで
        const randomLatLng = new google.maps.LatLng(lat, lng);

        streetViewService.getPanorama({
            location: randomLatLng,
            radius: 50000, // 50km範囲で探す
            source: google.maps.StreetViewSource.OUTDOOR // 屋外のストリートビューのみを対象
        }, (data, status) => {
            if (status === google.maps.StreetViewStatus.OK && data.location && data.location.latLng) {
                panorama.setPano(data.location.pano);
                actualLocation = data.location.latLng;
                document.getElementById('guessButton').disabled = false;
                map.setCenter({ lat: 0, lng: 0 }); // 地図を初期状態に戻す
                map.setZoom(1);
            } else {
                // 見つからなかった場合は再試行
                tryFindLocation();
            }
        });
    };

    tryFindLocation();
}

// 推測マーカーを地図に配置
function placeGuessMarker(location) {
    if (guessMarker) {
        guessMarker.setMap(null); // 既存のマーカーを削除
    }
    guessMarker = new google.maps.Marker({
        position: location,
        map: map,
        title: 'あなたの推測',
        icon: {
            url: "http://maps.google.com/mapfiles/ms/icons/blue-dot.png" // 青いピン
        }
    });
    document.getElementById('guessButton').disabled = false;
}

// 結果を計算して表示
function calculateResult() {
    if (!guessMarker || !actualLocation) {
        alert('先に地図をクリックして推測を置いてください！');
        return;
    }

    // 正解の場所を地図に表示
    actualMarker = new google.maps.Marker({
        position: actualLocation,
        map: map,
        title: '正解',
        icon: {
            url: "http://maps.google.com/mapfiles/ms/icons/red-dot.png" // 赤いピン
        }
    });

    // 推測地点と正解地点を結ぶ線を表示
    polyline = new google.maps.Polyline({
        path: [guessMarker.getPosition(), actualLocation],
        geodesic: true,
        strokeColor: '#FF0000',
        strokeOpacity: 0.8,
        strokeWeight: 3,
        map: map
    });

    // 距離を計算 (geometryライブラリが必要)
    const distance = google.maps.geometry.spherical.computeDistanceBetween(
        guessMarker.getPosition(), actualLocation
    );

    // スコアリング (例: 距離が短いほど高得点)
    // 簡易的な例なので、スコアは距離をそのまま表示
    const kmDistance = (distance / 1000).toFixed(2);
    document.getElementById('result').textContent = `距離: ${kmDistance} km`;

    // 地図を推測地点と正解地点の両方が見えるように調整
    const bounds = new google.maps.LatLngBounds();
    bounds.extend(guessMarker.getPosition());
    bounds.extend(actualLocation);
    map.fitBounds(bounds);

    // ボタンの有効/無効切り替え
    document.getElementById('guessButton').disabled = true;
    document.getElementById('nextRoundButton').disabled = false;
}

// マーカーと線をクリアする
function clearMarkersAndLines() {
    if (guessMarker) {
        guessMarker.setMap(null);
        guessMarker = null;
    }
    if (actualMarker) {
        actualMarker.setMap(null);
        actualMarker = null;
    }
    if (polyline) {
        polyline.setMap(null);
        polyline = null;
    }
}