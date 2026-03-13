# 쇼핑 리스트 앱

간단한 쇼핑 리스트 웹 앱입니다. 순수 HTML/CSS/JavaScript로 만들어졌으며, localStorage를 사용해 데이터를 저장합니다.

## 기능

- 아이템 추가 (버튼 클릭 또는 Enter 키)
- 아이템 체크/완료 처리
- 아이템 삭제
- 체크된 항목 일괄 삭제
- 통계 표시 (전체 / 완료 개수)
- 새로고침 후에도 데이터 유지 (localStorage)

## 사용법

`shopping-list.html` 파일을 브라우저에서 열면 바로 사용할 수 있습니다.

## 테스트

Playwright를 사용한 E2E 테스트가 포함되어 있습니다.

```bash
npm install
npx playwright install
npm test
```
