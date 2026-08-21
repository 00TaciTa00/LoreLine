type FieldLabelProps = {
  children: React.ReactNode;
  /** 필수면 붉은 * 를 붙인다 */
  required?: boolean;
  /**
   * 짝지을 입력의 id. 주면 <label>이 되어 눌렀을 때 입력에 포커스가 간다.
   * MultiSelect처럼 입력이 여러 개라 하나를 가리킬 수 없으면 생략한다.
   */
  htmlFor?: string;
  /** 라벨 뒤에 흐리게 덧붙일 말 (예: "여러 개 선택") */
  hint?: string;
};

/**
 * 폼 항목 이름표.
 *
 * 같은 클래스 문자열이 폼마다 복사돼 있던 것을 모은다. 필수 표시를 한 군데서
 * 정하려는 목적도 있다.
 *
 * `*`는 `aria-hidden`이다. 필수라는 사실은 입력 쪽의 `required`(또는
 * `aria-required`)가 이미 전하므로 두 번 읽어줄 필요가 없다. 색만으로는 뜻이
 * 전달되지 않으니 붉은색이 아니라 `*` 글자 자체가 표시를 맡는다.
 */
export function FieldLabel({
  children,
  required,
  htmlFor,
  hint,
}: FieldLabelProps) {
  const content = (
    <>
      {children}
      {required && (
        <span aria-hidden="true" className="ml-0.5 text-red-600">
          *
        </span>
      )}
      {hint && <span className="ml-1.5 text-xs text-zinc-400">{hint}</span>}
    </>
  );

  const className =
    "mb-1.5 block text-sm text-zinc-600 dark:text-zinc-400";

  if (htmlFor) {
    return (
      <label htmlFor={htmlFor} className={className}>
        {content}
      </label>
    );
  }
  return <p className={className}>{content}</p>;
}
