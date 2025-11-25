const PrivacyPolicy = () => {
  return (
    <div className="max-w-4xl mx-auto py-8 px-4">
      <div className="card p-6 sm:p-8 lg:p-10">
        <div className="mb-8 pb-6 border-b border-gray-200 dark:border-gray-700">
          <h1 className="text-3xl sm:text-4xl font-bold text-gray-900 dark:text-gray-100 mb-3">개인정보처리방침</h1>
          <p className="text-gray-600 dark:text-gray-400">원스휴먼 메메틱 노트의 개인정보 보호 정책</p>
        </div>

        <div className="space-y-6">
          {/* 1. 개인정보의 처리 목적 */}
          <section className="bg-white dark:bg-gray-800 rounded-xl p-6 border border-gray-200 dark:border-gray-700 transition-colors duration-200">
            <div className="flex items-start gap-3 mb-4">
              <div className="w-8 h-8 bg-gradient-to-br from-primary-500 to-primary-600 rounded-lg flex items-center justify-center flex-shrink-0 text-white font-bold text-sm">
                1
              </div>
              <h2 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-gray-100">개인정보의 처리 목적</h2>
            </div>
            <p className="mb-4 text-gray-700 dark:text-gray-300 leading-relaxed">
              원스휴먼 메메틱 노트(이하 '본 서비스')는 다음의 목적을 위하여 개인정보를 처리합니다.
              처리하고 있는 개인정보는 다음의 목적 이외의 용도로는 이용되지 않으며,
              이용 목적이 변경되는 경우에는 「개인정보 보호법」 제18조에 따라 별도의 동의를 받는 등 필요한 조치를 이행할 예정입니다.
            </p>
            <ul className="space-y-3">
              <li className="flex items-start gap-3 text-gray-700 dark:text-gray-300">
                <span className="w-2 h-2 bg-primary-500 rounded-full mt-2 flex-shrink-0"></span>
                <span><strong className="text-gray-900 dark:text-gray-100">회원 가입 및 관리:</strong> Discord OAuth 2.0을 통한 회원 가입, 본인 확인, 회원 식별</span>
              </li>
              <li className="flex items-start gap-3 text-gray-700 dark:text-gray-300">
                <span className="w-2 h-2 bg-primary-500 rounded-full mt-2 flex-shrink-0"></span>
                <span><strong className="text-gray-900 dark:text-gray-100">서비스 제공:</strong> 메메틱 정보 관리, 캐릭터 관리, 거래 게시판 기능 제공</span>
              </li>
              <li className="flex items-start gap-3 text-gray-700 dark:text-gray-300">
                <span className="w-2 h-2 bg-primary-500 rounded-full mt-2 flex-shrink-0"></span>
                <span><strong className="text-gray-900 dark:text-gray-100">커뮤니티 기능:</strong> 거래 요청, 후기 작성, 신뢰도 평가 시스템 제공</span>
              </li>
              <li className="flex items-start gap-3 text-gray-700 dark:text-gray-300">
                <span className="w-2 h-2 bg-primary-500 rounded-full mt-2 flex-shrink-0"></span>
                <span><strong className="text-gray-900 dark:text-gray-100">서비스 개선:</strong> 이용자의 서비스 이용 통계 및 분석</span>
              </li>
            </ul>
          </section>

          {/* 2. 처리하는 개인정보의 항목 */}
          <section className="bg-white dark:bg-gray-800 rounded-xl p-6 border border-gray-200 dark:border-gray-700 transition-colors duration-200">
            <div className="flex items-start gap-3 mb-4">
              <div className="w-8 h-8 bg-gradient-to-br from-primary-500 to-primary-600 rounded-lg flex items-center justify-center flex-shrink-0 text-white font-bold text-sm">
                2
              </div>
              <h2 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-gray-100">처리하는 개인정보의 항목</h2>
            </div>
            <div className="space-y-4">
              <div className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 p-5 rounded-lg border border-blue-200 dark:border-blue-700">
                <h3 className="font-bold text-gray-900 dark:text-gray-100 mb-3 flex items-center gap-2">
                  <svg className="w-5 h-5 text-blue-600 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                  </svg>
                  필수 수집 항목 (Discord OAuth 2.0)
                </h3>
                <ul className="space-y-2">
                  <li className="flex items-start gap-2 text-gray-700 dark:text-gray-300">
                    <span className="w-1.5 h-1.5 bg-blue-600 dark:bg-blue-400 rounded-full mt-2 flex-shrink-0"></span>
                    <span>Discord 사용자 ID</span>
                  </li>
                  <li className="flex items-start gap-2 text-gray-700 dark:text-gray-300">
                    <span className="w-1.5 h-1.5 bg-blue-600 dark:bg-blue-400 rounded-full mt-2 flex-shrink-0"></span>
                    <span>Discord 사용자명</span>
                  </li>
                  <li className="flex items-start gap-2 text-gray-700 dark:text-gray-300">
                    <span className="w-1.5 h-1.5 bg-blue-600 dark:bg-blue-400 rounded-full mt-2 flex-shrink-0"></span>
                    <span>Discord 프로필 이미지</span>
                  </li>
                </ul>
              </div>
              <div className="bg-gradient-to-r from-purple-50 to-pink-50 dark:from-purple-900/20 dark:to-pink-900/20 p-5 rounded-lg border border-purple-200 dark:border-purple-700">
                <h3 className="font-bold text-gray-900 dark:text-gray-100 mb-3 flex items-center gap-2">
                  <svg className="w-5 h-5 text-purple-600 dark:text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                  </svg>
                  서비스 이용 과정에서 생성되는 정보
                </h3>
                <ul className="space-y-2">
                  <li className="flex items-start gap-2 text-gray-700 dark:text-gray-300">
                    <span className="w-1.5 h-1.5 bg-purple-600 dark:bg-purple-400 rounded-full mt-2 flex-shrink-0"></span>
                    <span>캐릭터 이름 및 메모</span>
                  </li>
                  <li className="flex items-start gap-2 text-gray-700 dark:text-gray-300">
                    <span className="w-1.5 h-1.5 bg-purple-600 dark:bg-purple-400 rounded-full mt-2 flex-shrink-0"></span>
                    <span>메메틱 정보 (레벨, 메모 등)</span>
                  </li>
                  <li className="flex items-start gap-2 text-gray-700 dark:text-gray-300">
                    <span className="w-1.5 h-1.5 bg-purple-600 dark:bg-purple-400 rounded-full mt-2 flex-shrink-0"></span>
                    <span>거래 게시글 내용</span>
                  </li>
                  <li className="flex items-start gap-2 text-gray-700 dark:text-gray-300">
                    <span className="w-1.5 h-1.5 bg-purple-600 dark:bg-purple-400 rounded-full mt-2 flex-shrink-0"></span>
                    <span>거래 후기 및 평가</span>
                  </li>
                  <li className="flex items-start gap-2 text-gray-700 dark:text-gray-300">
                    <span className="w-1.5 h-1.5 bg-purple-600 dark:bg-purple-400 rounded-full mt-2 flex-shrink-0"></span>
                    <span>서비스 이용 기록, 접속 로그</span>
                  </li>
                </ul>
              </div>
            </div>
          </section>

          {/* 3. 개인정보의 처리 및 보유 기간 */}
          <section className="bg-white dark:bg-gray-800 rounded-xl p-6 border border-gray-200 dark:border-gray-700 transition-colors duration-200">
            <div className="flex items-start gap-3 mb-4">
              <div className="w-8 h-8 bg-gradient-to-br from-primary-500 to-primary-600 rounded-lg flex items-center justify-center flex-shrink-0 text-white font-bold text-sm">
                3
              </div>
              <h2 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-gray-100">개인정보의 처리 및 보유 기간</h2>
            </div>
            <ul className="space-y-3 mb-4">
              <li className="flex items-start gap-3 text-gray-700 dark:text-gray-300">
                <span className="w-2 h-2 bg-primary-500 rounded-full mt-2 flex-shrink-0"></span>
                <span><strong className="text-gray-900 dark:text-gray-100">회원 정보:</strong> 회원 탈퇴 시까지</span>
              </li>
              <li className="flex items-start gap-3 text-gray-700 dark:text-gray-300">
                <span className="w-2 h-2 bg-primary-500 rounded-full mt-2 flex-shrink-0"></span>
                <span><strong className="text-gray-900 dark:text-gray-100">거래 정보:</strong> 거래 완료 후 3년 (전자상거래법 준수)</span>
              </li>
              <li className="flex items-start gap-3 text-gray-700 dark:text-gray-300">
                <span className="w-2 h-2 bg-primary-500 rounded-full mt-2 flex-shrink-0"></span>
                <span><strong className="text-gray-900 dark:text-gray-100">서비스 이용 기록:</strong> 3개월</span>
              </li>
            </ul>
            <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700 rounded-lg p-4">
              <p className="text-sm text-amber-800 dark:text-amber-300 flex items-start gap-2">
                <svg className="w-5 h-5 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                </svg>
                <span>※ 단, 관계 법령 위반에 따른 수사·조사 등이 진행 중인 경우에는 해당 수사·조사 종료 시까지 보관합니다.</span>
              </p>
            </div>
          </section>

          {/* 4. 개인정보의 제3자 제공 */}
          <section className="bg-white dark:bg-gray-800 rounded-xl p-6 border border-gray-200 dark:border-gray-700 transition-colors duration-200">
            <div className="flex items-start gap-3 mb-4">
              <div className="w-8 h-8 bg-gradient-to-br from-primary-500 to-primary-600 rounded-lg flex items-center justify-center flex-shrink-0 text-white font-bold text-sm">
                4
              </div>
              <h2 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-gray-100">개인정보의 제3자 제공</h2>
            </div>
            <p className="mb-4 text-gray-700 dark:text-gray-300 leading-relaxed">
              본 서비스는 이용자의 개인정보를 원칙적으로 외부에 제공하지 않습니다.
              다만, 아래의 경우에는 예외로 합니다.
            </p>
            <ul className="space-y-3">
              <li className="flex items-start gap-3 text-gray-700 dark:text-gray-300">
                <span className="w-2 h-2 bg-primary-500 rounded-full mt-2 flex-shrink-0"></span>
                <span>이용자가 사전에 동의한 경우</span>
              </li>
              <li className="flex items-start gap-3 text-gray-700 dark:text-gray-300">
                <span className="w-2 h-2 bg-primary-500 rounded-full mt-2 flex-shrink-0"></span>
                <span>법령의 규정에 의거하거나, 수사 목적으로 법령에 정해진 절차와 방법에 따라 수사기관의 요구가 있는 경우</span>
              </li>
            </ul>
          </section>

          {/* 5. 개인정보 처리의 위탁 */}
          <section className="bg-white dark:bg-gray-800 rounded-xl p-6 border border-gray-200 dark:border-gray-700 transition-colors duration-200">
            <div className="flex items-start gap-3 mb-4">
              <div className="w-8 h-8 bg-gradient-to-br from-primary-500 to-primary-600 rounded-lg flex items-center justify-center flex-shrink-0 text-white font-bold text-sm">
                5
              </div>
              <h2 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-gray-100">개인정보 처리의 위탁</h2>
            </div>
            <div className="bg-gradient-to-r from-gray-50 to-gray-100 dark:from-gray-700 dark:to-gray-600 p-5 rounded-lg border border-gray-200 dark:border-gray-600 overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b-2 border-gray-300 dark:border-gray-500">
                    <th className="text-left py-3 font-bold text-gray-900 dark:text-gray-100">수탁업체</th>
                    <th className="text-left py-3 font-bold text-gray-900 dark:text-gray-100">위탁 업무 내용</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td className="py-3 text-gray-700 dark:text-gray-300 font-medium">Discord Inc.</td>
                    <td className="py-3 text-gray-700 dark:text-gray-300">회원 인증 및 로그인 서비스</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </section>

          {/* 6. 이용자의 권리·의무 및 행사 방법 */}
          <section className="bg-white dark:bg-gray-800 rounded-xl p-6 border border-gray-200 dark:border-gray-700 transition-colors duration-200">
            <div className="flex items-start gap-3 mb-4">
              <div className="w-8 h-8 bg-gradient-to-br from-primary-500 to-primary-600 rounded-lg flex items-center justify-center flex-shrink-0 text-white font-bold text-sm">
                6
              </div>
              <h2 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-gray-100">이용자의 권리·의무 및 행사 방법</h2>
            </div>
            <p className="mb-4 text-gray-700 dark:text-gray-300 leading-relaxed">이용자는 개인정보주체로서 다음과 같은 권리를 행사할 수 있습니다.</p>
            <ul className="space-y-3 mb-5">
              <li className="flex items-start gap-3 text-gray-700 dark:text-gray-300">
                <span className="w-2 h-2 bg-primary-500 rounded-full mt-2 flex-shrink-0"></span>
                <span>개인정보 열람 요구</span>
              </li>
              <li className="flex items-start gap-3 text-gray-700 dark:text-gray-300">
                <span className="w-2 h-2 bg-primary-500 rounded-full mt-2 flex-shrink-0"></span>
                <span>오류 등이 있을 경우 정정 요구</span>
              </li>
              <li className="flex items-start gap-3 text-gray-700 dark:text-gray-300">
                <span className="w-2 h-2 bg-primary-500 rounded-full mt-2 flex-shrink-0"></span>
                <span>삭제 요구</span>
              </li>
              <li className="flex items-start gap-3 text-gray-700 dark:text-gray-300">
                <span className="w-2 h-2 bg-primary-500 rounded-full mt-2 flex-shrink-0"></span>
                <span>처리정지 요구</span>
              </li>
            </ul>
            <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg border border-blue-200 dark:border-blue-700">
              <p className="text-sm text-blue-800 dark:text-blue-300 flex items-start gap-2 leading-relaxed">
                <svg className="w-5 h-5 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                </svg>
                <span>권리 행사는 서비스 내 '내 정보' 메뉴에서 직접 처리하거나, 개인정보 보호책임자에게 서면, 전화, 이메일 등으로 연락하시면 지체 없이 조치하겠습니다.</span>
              </p>
            </div>
          </section>

          {/* 7. 개인정보의 파기 */}
          <section className="bg-white dark:bg-gray-800 rounded-xl p-6 border border-gray-200 dark:border-gray-700 transition-colors duration-200">
            <div className="flex items-start gap-3 mb-4">
              <div className="w-8 h-8 bg-gradient-to-br from-primary-500 to-primary-600 rounded-lg flex items-center justify-center flex-shrink-0 text-white font-bold text-sm">
                7
              </div>
              <h2 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-gray-100">개인정보의 파기</h2>
            </div>
            <p className="mb-5 text-gray-700 dark:text-gray-300 leading-relaxed">
              본 서비스는 개인정보 보유기간의 경과, 처리목적 달성 등 개인정보가 불필요하게 되었을 때에는
              지체없이 해당 개인정보를 파기합니다.
            </p>
            <div className="space-y-4">
              <div>
                <p className="font-bold text-gray-900 dark:text-gray-100 mb-2">파기 절차</p>
                <p className="text-gray-700 dark:text-gray-300 leading-relaxed">이용자가 입력한 정보는 목적 달성 후 별도의 DB에 옮겨져 내부 방침 및 기타 관련 법령에 따라 일정기간 저장된 후 혹은 즉시 파기됩니다.</p>
              </div>
              <div>
                <p className="font-bold text-gray-900 dark:text-gray-100 mb-3">파기 방법</p>
                <ul className="space-y-2">
                  <li className="flex items-start gap-3 text-gray-700 dark:text-gray-300">
                    <span className="w-2 h-2 bg-primary-500 rounded-full mt-2 flex-shrink-0"></span>
                    <span><strong className="text-gray-900 dark:text-gray-100">전자적 파일 형태:</strong> 복원이 불가능한 방법으로 영구 삭제</span>
                  </li>
                  <li className="flex items-start gap-3 text-gray-700 dark:text-gray-300">
                    <span className="w-2 h-2 bg-primary-500 rounded-full mt-2 flex-shrink-0"></span>
                    <span><strong className="text-gray-900 dark:text-gray-100">기록물, 인쇄물, 서면:</strong> 분쇄 또는 소각</span>
                  </li>
                </ul>
              </div>
            </div>
          </section>

          {/* 8. 개인정보의 안전성 확보 조치 */}
          <section className="bg-white dark:bg-gray-800 rounded-xl p-6 border border-gray-200 dark:border-gray-700 transition-colors duration-200">
            <div className="flex items-start gap-3 mb-4">
              <div className="w-8 h-8 bg-gradient-to-br from-primary-500 to-primary-600 rounded-lg flex items-center justify-center flex-shrink-0 text-white font-bold text-sm">
                8
              </div>
              <h2 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-gray-100">개인정보의 안전성 확보 조치</h2>
            </div>
            <p className="mb-4 text-gray-700 dark:text-gray-300 leading-relaxed">본 서비스는 개인정보의 안전성 확보를 위해 다음과 같은 조치를 취하고 있습니다.</p>
            <ul className="space-y-3">
              <li className="flex items-start gap-3 text-gray-700 dark:text-gray-300">
                <span className="w-2 h-2 bg-primary-500 rounded-full mt-2 flex-shrink-0"></span>
                <span><strong className="text-gray-900 dark:text-gray-100">개인정보 암호화:</strong> 비밀번호는 암호화되어 저장 및 관리</span>
              </li>
              <li className="flex items-start gap-3 text-gray-700 dark:text-gray-300">
                <span className="w-2 h-2 bg-primary-500 rounded-full mt-2 flex-shrink-0"></span>
                <span><strong className="text-gray-900 dark:text-gray-100">해킹 등에 대비한 기술적 대책:</strong> 백신 프로그램 설치 및 주기적 업데이트</span>
              </li>
              <li className="flex items-start gap-3 text-gray-700 dark:text-gray-300">
                <span className="w-2 h-2 bg-primary-500 rounded-full mt-2 flex-shrink-0"></span>
                <span><strong className="text-gray-900 dark:text-gray-100">개인정보 접근 제한:</strong> 개인정보를 처리하는 데이터베이스 시스템에 대한 접근권한 부여·변경·말소를 통해 개인정보에 대한 접근통제</span>
              </li>
              <li className="flex items-start gap-3 text-gray-700 dark:text-gray-300">
                <span className="w-2 h-2 bg-primary-500 rounded-full mt-2 flex-shrink-0"></span>
                <span><strong className="text-gray-900 dark:text-gray-100">접속기록 보관:</strong> 개인정보처리시스템 접속기록을 최소 6개월 이상 보관·관리</span>
              </li>
            </ul>
          </section>

          {/* 9. 개인정보 보호책임자 */}
          <section className="bg-white dark:bg-gray-800 rounded-xl p-6 border border-gray-200 dark:border-gray-700 transition-colors duration-200">
            <div className="flex items-start gap-3 mb-4">
              <div className="w-8 h-8 bg-gradient-to-br from-primary-500 to-primary-600 rounded-lg flex items-center justify-center flex-shrink-0 text-white font-bold text-sm">
                9
              </div>
              <h2 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-gray-100">개인정보 보호책임자</h2>
            </div>
            <p className="mb-5 text-gray-700 dark:text-gray-300 leading-relaxed">
              본 서비스는 개인정보 처리에 관한 업무를 총괄해서 책임지고,
              개인정보 처리와 관련한 정보주체의 불만처리 및 피해구제 등을 위하여 아래와 같이 개인정보 보호책임자를 지정하고 있습니다.
            </p>
            <div className="bg-gradient-to-r from-indigo-50 to-purple-50 dark:from-indigo-900/20 dark:to-purple-900/20 p-6 rounded-lg border border-indigo-200 dark:border-indigo-700">
              <div className="flex items-center gap-2 mb-3">
                <svg className="w-6 h-6 text-indigo-600 dark:text-indigo-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
                <p className="font-bold text-gray-900 dark:text-gray-100">개인정보 보호책임자</p>
              </div>
              <p className="text-sm text-gray-700 dark:text-gray-300 mb-4">문의사항이 있으시면 아래 연락처로 문의해주시기 바랍니다.</p>
              <a
                href="https://discord.com/users/374497302452371456"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 px-4 py-2.5 bg-indigo-600 dark:bg-indigo-500 hover:bg-indigo-700 dark:hover:bg-indigo-600 text-white rounded-lg font-medium transition-colors shadow-sm"
              >
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M20.317 4.492c-1.53-.69-3.17-1.2-4.885-1.49a.075.075 0 0 0-.079.036c-.21.369-.444.85-.608 1.23a18.566 18.566 0 0 0-5.487 0 12.36 12.36 0 0 0-.617-1.23A.077.077 0 0 0 8.562 3c-1.714.29-3.354.8-4.885 1.491a.07.07 0 0 0-.032.027C.533 9.093-.32 13.555.099 17.961a.08.08 0 0 0 .031.055 20.03 20.03 0 0 0 5.993 2.98.078.078 0 0 0 .084-.026 13.83 13.83 0 0 0 1.226-1.963.074.074 0 0 0-.041-.104 13.175 13.175 0 0 1-1.872-.878.075.075 0 0 1-.008-.125c.126-.093.252-.19.372-.287a.075.075 0 0 1 .078-.01c3.928 1.764 8.18 1.764 12.061 0a.075.075 0 0 1 .079.009c.12.098.245.195.372.288a.075.075 0 0 1-.006.125c-.598.344-1.22.635-1.873.877a.075.075 0 0 0-.041.105c.36.687.772 1.341 1.225 1.962a.077.077 0 0 0 .084.028 19.963 19.963 0 0 0 6.002-2.981.076.076 0 0 0 .032-.054c.5-5.094-.838-9.52-3.549-13.442a.06.06 0 0 0-.031-.028zM8.02 15.278c-1.182 0-2.157-1.069-2.157-2.38 0-1.312.956-2.38 2.157-2.38 1.21 0 2.176 1.077 2.157 2.38 0 1.312-.956 2.38-2.157 2.38zm7.975 0c-1.183 0-2.157-1.069-2.157-2.38 0-1.312.955-2.38 2.157-2.38 1.21 0 2.176 1.077 2.157 2.38 0 1.312-.946 2.38-2.157 2.38z"/>
                </svg>
                Discord로 문의하기
              </a>
            </div>
          </section>

          {/* 10. 개인정보 처리방침 변경 */}
          <section className="bg-white dark:bg-gray-800 rounded-xl p-6 border border-gray-200 dark:border-gray-700 transition-colors duration-200">
            <div className="flex items-start gap-3 mb-4">
              <div className="w-8 h-8 bg-gradient-to-br from-primary-500 to-primary-600 rounded-lg flex items-center justify-center flex-shrink-0 text-white font-bold text-sm">
                10
              </div>
              <h2 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-gray-100">개인정보 처리방침 변경</h2>
            </div>
            <p className="text-gray-700 dark:text-gray-300 leading-relaxed">
              이 개인정보 처리방침은 시행일로부터 적용되며,
              법령 및 방침에 따른 변경내용의 추가, 삭제 및 정정이 있는 경우에는
              변경사항의 시행 7일 전부터 공지사항을 통하여 고지할 것입니다.
            </p>
          </section>

          {/* 공고일자 */}
          <div className="bg-gradient-to-r from-gray-50 to-gray-100 dark:from-gray-800 dark:to-gray-700 rounded-xl p-5 border border-gray-200 dark:border-gray-700 mt-6">
            <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
              <svg className="w-5 h-5 text-gray-500 dark:text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
              <div>
                <span className="font-semibold text-gray-900 dark:text-gray-100">공고일자:</span> 2025년 10월 19일
                <span className="mx-2 text-gray-400 dark:text-gray-500">|</span>
                <span className="font-semibold text-gray-900 dark:text-gray-100">시행일자:</span> 2025년 10월 19일
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PrivacyPolicy;
