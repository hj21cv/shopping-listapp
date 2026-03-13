const { test, expect } = require('@playwright/test');

const SUPABASE_URL = 'https://pfjcbtmyvlzvjquccisw.supabase.co';
const SUPABASE_ANON_KEY =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBmamNidG15dmx6dmpxdWNjaXN3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzMzNzg4NjYsImV4cCI6MjA4ODk1NDg2Nn0.DeaasL5C5d6fdC2ffQOCxIVEW7uZs0tk6PmZmTHkXHs';

const SUPABASE_HEADERS = {
  apikey: SUPABASE_ANON_KEY,
  Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
  'Content-Type': 'application/json',
  Prefer: 'return=representation',
};

// 각 테스트 전: DB 전체 초기화 후 페이지 로드
test.beforeEach(async ({ page, request }) => {
  await request.delete(
    `${SUPABASE_URL}/rest/v1/shopping_items?id=not.is.null`,
    { headers: SUPABASE_HEADERS }
  );
  await page.goto('/');
  await page.waitForSelector('#loading', { state: 'hidden', timeout: 15000 });
});

// ──────────────────────────────────────────────
// 헬퍼: DB에서 모든 아이템 조회
// ──────────────────────────────────────────────
async function fetchDBItems(request) {
  const res = await request.get(
    `${SUPABASE_URL}/rest/v1/shopping_items?select=*&order=created_at`,
    { headers: SUPABASE_HEADERS }
  );
  return res.json();
}

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
// 2. 아이템 추가 - 버튼 클릭 + DB 확인
// ──────────────────────────────────────────────
test('추가 버튼으로 아이템을 추가할 수 있다', async ({ page, request }) => {
  await page.fill('#itemInput', '사과');
  await page.click('button:has-text("추가")');

  const items = page.locator('#list li');
  await expect(items).toHaveCount(1);
  await expect(items.first()).toContainText('사과');
  await expect(page.locator('#empty')).toBeHidden();

  // Supabase DB 직접 확인
  const dbItems = await fetchDBItems(request);
  expect(dbItems).toHaveLength(1);
  expect(dbItems[0].text).toBe('사과');
  expect(dbItems[0].checked).toBe(false);
});

// ──────────────────────────────────────────────
// 3. 아이템 추가 - Enter 키 + DB 확인
// ──────────────────────────────────────────────
test('Enter 키로 아이템을 추가할 수 있다', async ({ page, request }) => {
  await page.fill('#itemInput', '바나나');
  await page.press('#itemInput', 'Enter');

  const items = page.locator('#list li');
  await expect(items).toHaveCount(1);
  await expect(items.first()).toContainText('바나나');

  const dbItems = await fetchDBItems(request);
  expect(dbItems).toHaveLength(1);
  expect(dbItems[0].text).toBe('바나나');
});

// ──────────────────────────────────────────────
// 4. 여러 아이템 추가 + DB 개수 확인
// ──────────────────────────────────────────────
test('여러 아이템을 순서대로 추가할 수 있다', async ({ page, request }) => {
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

  const dbItems = await fetchDBItems(request);
  expect(dbItems).toHaveLength(4);
});

// ──────────────────────────────────────────────
// 5. 빈 입력 무시 (DB에 저장되지 않아야 함)
// ──────────────────────────────────────────────
test('빈 입력값은 추가되지 않는다', async ({ page, request }) => {
  await page.click('button:has-text("추가")');
  await expect(page.locator('#list li')).toHaveCount(0);

  await page.fill('#itemInput', '   ');
  await page.press('#itemInput', 'Enter');
  await expect(page.locator('#list li')).toHaveCount(0);

  const dbItems = await fetchDBItems(request);
  expect(dbItems).toHaveLength(0);
});

// ──────────────────────────────────────────────
// 6. 아이템 삭제 + DB 확인
// ──────────────────────────────────────────────
test('삭제 버튼으로 아이템을 삭제할 수 있다', async ({ page, request }) => {
  await page.fill('#itemInput', '오렌지');
  await page.press('#itemInput', 'Enter');
  await page.fill('#itemInput', '포도');
  await page.press('#itemInput', 'Enter');

  await expect(page.locator('#list li')).toHaveCount(2);

  await page.locator('#list li').first().locator('.delete-btn').click();

  await expect(page.locator('#list li')).toHaveCount(1);
  await expect(page.locator('#list li').first()).toContainText('포도');

  const dbItems = await fetchDBItems(request);
  expect(dbItems).toHaveLength(1);
  expect(dbItems[0].text).toBe('포도');
});

// ──────────────────────────────────────────────
// 7. 마지막 아이템 삭제 후 빈 메시지 표시
// ──────────────────────────────────────────────
test('모든 아이템 삭제 후 빈 메시지가 표시된다', async ({ page, request }) => {
  await page.fill('#itemInput', '딸기');
  await page.press('#itemInput', 'Enter');

  await page.locator('#list li').first().locator('.delete-btn').click();

  await expect(page.locator('#list li')).toHaveCount(0);
  await expect(page.locator('#empty')).toBeVisible();

  const dbItems = await fetchDBItems(request);
  expect(dbItems).toHaveLength(0);
});

// ──────────────────────────────────────────────
// 8. 체크박스 토글 + DB checked 상태 확인
// ──────────────────────────────────────────────
test('체크박스 클릭으로 아이템을 완료 처리할 수 있다', async ({ page, request }) => {
  await page.fill('#itemInput', '치즈');
  await page.press('#itemInput', 'Enter');

  const item = page.locator('#list li').first();
  await expect(item).not.toHaveClass(/checked/);

  await item.locator('.checkbox').click();
  await expect(item).toHaveClass(/checked/);

  // 취소선 스타일 확인
  await expect(item.locator('.item-text')).toHaveCSS('text-decoration-line', 'line-through');

  // DB에서 checked=true 확인
  const dbItems = await fetchDBItems(request);
  expect(dbItems[0].checked).toBe(true);
});

// ──────────────────────────────────────────────
// 9. 체크박스 재클릭으로 완료 취소 + DB 확인
// ──────────────────────────────────────────────
test('체크된 아이템을 다시 클릭하면 완료가 취소된다', async ({ page, request }) => {
  await page.fill('#itemInput', '요거트');
  await page.press('#itemInput', 'Enter');

  const item = page.locator('#list li').first();
  await item.locator('.checkbox').click();
  await expect(item).toHaveClass(/checked/);

  await item.locator('.checkbox').click();
  await expect(item).not.toHaveClass(/checked/);

  const dbItems = await fetchDBItems(request);
  expect(dbItems[0].checked).toBe(false);
});

// ──────────────────────────────────────────────
// 10. 텍스트 클릭으로 체크 토글 + DB 확인
// ──────────────────────────────────────────────
test('아이템 텍스트 클릭으로도 체크 토글이 된다', async ({ page, request }) => {
  await page.fill('#itemInput', '주스');
  await page.press('#itemInput', 'Enter');

  const item = page.locator('#list li').first();
  await item.locator('.item-text').click();
  await expect(item).toHaveClass(/checked/);

  const dbItems = await fetchDBItems(request);
  expect(dbItems[0].checked).toBe(true);
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

  await page.locator('#list li').first().locator('.checkbox').click();
  await expect(page.locator('#stats')).toContainText('1');
});

// ──────────────────────────────────────────────
// 12. 체크된 항목 일괄 삭제 + DB 확인
// ──────────────────────────────────────────────
test('"체크된 항목 삭제" 버튼이 체크된 아이템만 삭제한다', async ({ page, request }) => {
  const itemNames = ['라면', '김치', '된장'];
  for (const name of itemNames) {
    await page.fill('#itemInput', name);
    await page.press('#itemInput', 'Enter');
  }

  await page.locator('#list li').nth(0).locator('.checkbox').click();
  await expect(page.locator('#list li').nth(0)).toHaveClass(/checked/); // DB 업데이트 완료 대기

  await page.locator('#list li').nth(2).locator('.checkbox').click();
  await expect(page.locator('#list li').nth(2)).toHaveClass(/checked/); // DB 업데이트 완료 대기

  await page.click('button:has-text("체크된 항목 삭제")');

  const remaining = page.locator('#list li');
  await expect(remaining).toHaveCount(1);
  await expect(remaining.first()).toContainText('김치');

  const dbItems = await fetchDBItems(request);
  expect(dbItems).toHaveLength(1);
  expect(dbItems[0].text).toBe('김치');
});

// ──────────────────────────────────────────────
// 13. 페이지 새로고침 후 Supabase 데이터 유지
// ──────────────────────────────────────────────
test('페이지 새로고침 후에도 아이템이 유지된다 (Supabase 저장)', async ({ page }) => {
  await page.fill('#itemInput', '감자');
  await page.press('#itemInput', 'Enter');
  await page.fill('#itemInput', '고구마');
  await page.press('#itemInput', 'Enter');

  await page.locator('#list li').first().locator('.checkbox').click();
  await expect(page.locator('#list li').first()).toHaveClass(/checked/); // DB 업데이트 완료 대기

  // 새로고침
  await page.reload();
  await page.waitForSelector('#loading', { state: 'hidden', timeout: 15000 });

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
