const { test, expect } = require('@playwright/test');
const path = require('path');

const FILE_URL = 'file:///' + path.resolve(__dirname, '../shopping-list.html').replace(/\\/g, '/');

test.beforeEach(async ({ page }) => {
  await page.goto(FILE_URL);
  // localStorage 초기화 (각 테스트 독립 실행)
  await page.evaluate(() => localStorage.clear());
  await page.reload();
});

// ──────────────────────────────────────────────
// 1. 페이지 기본 렌더링
// ──────────────────────────────────────────────
test('페이지가 올바르게 로드된다', async ({ page }) => {
  await expect(page).toHaveTitle('쇼핑 리스트');
  await expect(page.locator('h1')).toContainText('쇼핑 리스트');
  await expect(page.locator('#itemInput')).toBeVisible();
  await expect(page.locator('button', { hasText: '추가' })).toBeVisible();
  await expect(page.locator('#empty')).toBeVisible();
});

// ──────────────────────────────────────────────
// 2. 아이템 추가 - 버튼 클릭
// ──────────────────────────────────────────────
test('추가 버튼으로 아이템을 추가할 수 있다', async ({ page }) => {
  await page.fill('#itemInput', '사과');
  await page.click('button:has-text("추가")');

  const items = page.locator('#list li');
  await expect(items).toHaveCount(1);
  await expect(items.first()).toContainText('사과');
  await expect(page.locator('#empty')).toBeHidden();
});

// ──────────────────────────────────────────────
// 3. 아이템 추가 - Enter 키
// ──────────────────────────────────────────────
test('Enter 키로 아이템을 추가할 수 있다', async ({ page }) => {
  await page.fill('#itemInput', '바나나');
  await page.press('#itemInput', 'Enter');

  const items = page.locator('#list li');
  await expect(items).toHaveCount(1);
  await expect(items.first()).toContainText('바나나');
});

// ──────────────────────────────────────────────
// 4. 여러 아이템 추가
// ──────────────────────────────────────────────
test('여러 아이템을 순서대로 추가할 수 있다', async ({ page }) => {
  const itemNames = ['우유', '계란', '빵', '버터'];

  for (const name of itemNames) {
    await page.fill('#itemInput', name);
    await page.press('#itemInput', 'Enter');
  }

  const items = page.locator('#list li');
  await expect(items).toHaveCount(4);

  for (let i = 0; i < itemNames.length; i++) {
    await expect(items.nth(i)).toContainText(itemNames[i]);
  }
});

// ──────────────────────────────────────────────
// 5. 빈 입력 무시
// ──────────────────────────────────────────────
test('빈 입력값은 추가되지 않는다', async ({ page }) => {
  await page.click('button:has-text("추가")');
  await expect(page.locator('#list li')).toHaveCount(0);

  await page.fill('#itemInput', '   ');
  await page.press('#itemInput', 'Enter');
  await expect(page.locator('#list li')).toHaveCount(0);
});

// ──────────────────────────────────────────────
// 6. 아이템 삭제
// ──────────────────────────────────────────────
test('삭제 버튼으로 아이템을 삭제할 수 있다', async ({ page }) => {
  await page.fill('#itemInput', '오렌지');
  await page.press('#itemInput', 'Enter');
  await page.fill('#itemInput', '포도');
  await page.press('#itemInput', 'Enter');

  await expect(page.locator('#list li')).toHaveCount(2);

  // 첫 번째 아이템 삭제
  await page.locator('#list li').first().locator('.delete-btn').click();

  await expect(page.locator('#list li')).toHaveCount(1);
  await expect(page.locator('#list li').first()).toContainText('포도');
});

// ──────────────────────────────────────────────
// 7. 마지막 아이템 삭제 후 빈 메시지 표시
// ──────────────────────────────────────────────
test('모든 아이템 삭제 후 빈 메시지가 표시된다', async ({ page }) => {
  await page.fill('#itemInput', '딸기');
  await page.press('#itemInput', 'Enter');

  await page.locator('#list li').first().locator('.delete-btn').click();

  await expect(page.locator('#list li')).toHaveCount(0);
  await expect(page.locator('#empty')).toBeVisible();
});

// ──────────────────────────────────────────────
// 8. 체크박스 토글
// ──────────────────────────────────────────────
test('체크박스 클릭으로 아이템을 완료 처리할 수 있다', async ({ page }) => {
  await page.fill('#itemInput', '치즈');
  await page.press('#itemInput', 'Enter');

  const item = page.locator('#list li').first();
  await expect(item).not.toHaveClass(/checked/);

  await item.locator('.checkbox').click();
  await expect(item).toHaveClass(/checked/);

  // 텍스트에 취소선 스타일 적용 확인
  await expect(item.locator('.item-text')).toHaveCSS('text-decoration-line', 'line-through');
});

// ──────────────────────────────────────────────
// 9. 체크박스 재클릭으로 완료 취소
// ──────────────────────────────────────────────
test('체크된 아이템을 다시 클릭하면 완료가 취소된다', async ({ page }) => {
  await page.fill('#itemInput', '요거트');
  await page.press('#itemInput', 'Enter');

  const item = page.locator('#list li').first();
  await item.locator('.checkbox').click(); // 체크
  await expect(item).toHaveClass(/checked/);

  await item.locator('.checkbox').click(); // 체크 해제
  await expect(item).not.toHaveClass(/checked/);
});

// ──────────────────────────────────────────────
// 10. 텍스트 클릭으로 체크 토글
// ──────────────────────────────────────────────
test('아이템 텍스트 클릭으로도 체크 토글이 된다', async ({ page }) => {
  await page.fill('#itemInput', '주스');
  await page.press('#itemInput', 'Enter');

  const item = page.locator('#list li').first();
  await item.locator('.item-text').click();
  await expect(item).toHaveClass(/checked/);
});

// ──────────────────────────────────────────────
// 11. 통계 표시
// ──────────────────────────────────────────────
test('아이템 추가/체크 시 통계가 올바르게 표시된다', async ({ page }) => {
  await page.fill('#itemInput', '커피');
  await page.press('#itemInput', 'Enter');
  await page.fill('#itemInput', '녹차');
  await page.press('#itemInput', 'Enter');

  await expect(page.locator('#stats')).toContainText('총');
  await expect(page.locator('#stats')).toContainText('2');
  await expect(page.locator('#stats')).toContainText('완료');

  // 하나 체크
  await page.locator('#list li').first().locator('.checkbox').click();
  await expect(page.locator('#stats')).toContainText('1');
});

// ──────────────────────────────────────────────
// 12. 체크된 항목 일괄 삭제
// ──────────────────────────────────────────────
test('"체크된 항목 삭제" 버튼이 체크된 아이템만 삭제한다', async ({ page }) => {
  const items = ['라면', '김치', '된장'];
  for (const name of items) {
    await page.fill('#itemInput', name);
    await page.press('#itemInput', 'Enter');
  }

  // 첫 번째, 세 번째 체크
  await page.locator('#list li').nth(0).locator('.checkbox').click();
  await page.locator('#list li').nth(2).locator('.checkbox').click();

  await page.click('button:has-text("체크된 항목 삭제")');

  const remaining = page.locator('#list li');
  await expect(remaining).toHaveCount(1);
  await expect(remaining.first()).toContainText('김치');
});

// ──────────────────────────────────────────────
// 13. localStorage 저장 및 복원
// ──────────────────────────────────────────────
test('페이지 새로고침 후에도 아이템이 유지된다', async ({ page }) => {
  await page.fill('#itemInput', '감자');
  await page.press('#itemInput', 'Enter');
  await page.fill('#itemInput', '고구마');
  await page.press('#itemInput', 'Enter');

  // 첫 번째 아이템 체크
  await page.locator('#list li').first().locator('.checkbox').click();

  // 새로고침
  await page.reload();

  const listItems = page.locator('#list li');
  await expect(listItems).toHaveCount(2);
  await expect(listItems.nth(0)).toContainText('감자');
  await expect(listItems.nth(0)).toHaveClass(/checked/);
  await expect(listItems.nth(1)).toContainText('고구마');
  await expect(listItems.nth(1)).not.toHaveClass(/checked/);
});

// ──────────────────────────────────────────────
// 14. 추가 후 입력창 초기화
// ──────────────────────────────────────────────
test('아이템 추가 후 입력창이 비워진다', async ({ page }) => {
  await page.fill('#itemInput', '토마토');
  await page.press('#itemInput', 'Enter');

  await expect(page.locator('#itemInput')).toHaveValue('');
});
